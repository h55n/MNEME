import os
import json
import logging
import re
from typing import Optional

import anthropic
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ── Logging ───────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [extraction] %(message)s",
)
logger = logging.getLogger("extraction")

# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="MNEME Extraction Service",
    description="LLM-based entity and fact extraction for the MNEME knowledge graph",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ── Anthropic client ──────────────────────────────────────────────────────────

_client: Optional[anthropic.Anthropic] = None


def get_client() -> Optional[anthropic.Anthropic]:
    global _client
    if _client is None:
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            logger.warning("ANTHROPIC_API_KEY not set — extraction will return empty results")
            return None
        _client = anthropic.Anthropic(api_key=api_key)
    return _client

# ── Cross-Encoder (Lazy Load) ─────────────────────────────────────────────────

_cross_encoder = None

def get_cross_encoder():
    global _cross_encoder
    if _cross_encoder is None:
        try:
            from sentence_transformers import CrossEncoder
            # Lazy load the model to prevent massive cold start unless used
            logger.info("Loading ms-marco-MiniLM-L-6-v2 CrossEncoder...")
            _cross_encoder = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2', max_length=512)
            logger.info("CrossEncoder loaded.")
        except Exception as e:
            logger.error("Failed to load CrossEncoder: %s", e)
            return None
    return _cross_encoder


# ── Schemas ───────────────────────────────────────────────────────────────────

class ExtractRequest(BaseModel):
    content: str
    memory_type: str = "semantic"
    vault_id: str = ""
    memory_id: str = ""


class Entity(BaseModel):
    label: str
    type: str


class Fact(BaseModel):
    subject: str
    subjectType: str
    object: str
    objectType: str
    fact: str
    confidence: float


class ExtractResponse(BaseModel):
    entities: list[Entity]
    facts: list[Fact]

class DocumentInput(BaseModel):
    id: str
    text: str

class RerankRequest(BaseModel):
    query: str
    documents: list[DocumentInput]
    top_n: Optional[int] = None

class RerankResult(BaseModel):
    id: str
    score: float

class RerankResponse(BaseModel):
    results: list[RerankResult]


# ── Extraction prompt ─────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a knowledge graph extraction engine. Extract named entities and relationships from the given text.

Return ONLY valid JSON in this exact format — no markdown, no explanation:
{
  "entities": [
    { "label": "Entity Name", "type": "PERSON|ORGANIZATION|CONCEPT|SKILL|LOCATION|DATE|PRODUCT" }
  ],
  "facts": [
    {
      "subject": "Entity Name",
      "subjectType": "PERSON|ORGANIZATION|CONCEPT|SKILL|LOCATION|DATE|PRODUCT",
      "object": "Entity Name",
      "objectType": "PERSON|ORGANIZATION|CONCEPT|SKILL|LOCATION|DATE|PRODUCT",
      "fact": "brief relationship description",
      "confidence": 0.85
    }
  ]
}

Rules:
- Only extract clear, factual relationships. Never infer.
- Minimum confidence threshold: 0.6
- Maximum 20 entities and 20 facts per text.
- Return {"entities": [], "facts": []} if no clear entities/facts found.
- Never include raw PII (emails, SSNs, phone numbers) as entity labels."""

EMPTY_RESULT = ExtractResponse(entities=[], facts=[])


def extract_json_from_text(text: str) -> dict:
    """Extract JSON from LLM response, handling markdown code blocks."""
    # Try stripping markdown code blocks
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if match:
        text = match.group(1)
    return json.loads(text.strip())


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    client = get_client()
    return {
        "status": "ok",
        "anthropic_configured": client is not None,
    }


@app.post("/extract", response_model=ExtractResponse)
async def extract(request: ExtractRequest) -> ExtractResponse:
    """
    Extract entities and facts from memory content.
    Returns empty arrays on any failure — never blocks the write path.
    """
    client = get_client()
    if client is None:
        return EMPTY_RESULT

    content = request.content[:4000]  # Token limit guard

    try:
        message = client.messages.create(
            model="claude-3-haiku-20240307",  # Fast and cost-efficient for extraction
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": f"Extract entities and facts from this {request.memory_type} memory:\n\n{content}",
                }
            ],
        )

        raw_text = message.content[0].text if message.content else ""
        if not raw_text.strip():
            return EMPTY_RESULT

        parsed = extract_json_from_text(raw_text)

        entities = [
            Entity(
                label=str(e.get("label", "")).strip(),
                type=str(e.get("type", "CONCEPT")).upper(),
            )
            for e in (parsed.get("entities") or [])
            if e.get("label")
        ][:20]

        facts = [
            Fact(
                subject=str(f.get("subject", "")).strip(),
                subjectType=str(f.get("subjectType", "CONCEPT")).upper(),
                object=str(f.get("object", "")).strip(),
                objectType=str(f.get("objectType", "CONCEPT")).upper(),
                fact=str(f.get("fact", "")).strip(),
                confidence=float(f.get("confidence", 0.7)),
            )
            for f in (parsed.get("facts") or [])
            if f.get("subject") and f.get("object") and float(f.get("confidence", 0)) >= 0.6
        ][:20]

        logger.info(
            "Extracted %d entities, %d facts from memory %s",
            len(entities),
            len(facts),
            request.memory_id or "unknown",
        )

        return ExtractResponse(entities=entities, facts=facts)

    except json.JSONDecodeError as e:
        logger.warning("JSON parse error in extraction response: %s", e)
        return EMPTY_RESULT
    except anthropic.APIError as e:
        logger.warning("Anthropic API error: %s", e)
        return EMPTY_RESULT
    except Exception as e:
        logger.error("Unexpected extraction error: %s", e, exc_info=True)
        return EMPTY_RESULT

@app.post("/rerank", response_model=RerankResponse)
async def rerank(request: RerankRequest) -> RerankResponse:
    """
    Rerank a list of documents against a query using a CrossEncoder.
    Returns the document IDs paired with their relevance score.
    """
    if not request.documents:
        return RerankResponse(results=[])

    encoder = get_cross_encoder()
    if encoder is None:
        raise HTTPException(status_code=500, detail="CrossEncoder not available")

    # Prepare inputs: list of (query, document_text) pairs
    pairs = [[request.query, doc.text] for doc in request.documents]
    
    try:
        # Compute scores
        scores = encoder.predict(pairs)
        
        # Combine IDs with scores
        results = [
            RerankResult(id=doc.id, score=float(score))
            for doc, score in zip(request.documents, scores)
        ]
        
        # Sort descending by score
        results.sort(key=lambda x: x.score, reverse=True)
        
        if request.top_n is not None and request.top_n > 0:
            results = results[:request.top_n]
            
        return RerankResponse(results=results)
        
    except Exception as e:
        logger.error("Reranking failed: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Reranking failed")


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")
