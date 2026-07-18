import {
  AttestationAggregatorContract_BatchAttested_loader,
  AttestationAggregatorContract_BatchAttested_handler,
  AttestationAggregatorContract_OwnershipTransferred_loader,
  AttestationAggregatorContract_OwnershipTransferred_handler,
  AttestationAggregatorContract_SubmitterAuthorised_loader,
  AttestationAggregatorContract_SubmitterAuthorised_handler,
} from "../generated/src/Handlers.gen";
import {
  batchAttestedEntity,
  ownershipTransferredEntity,
  submitterAuthorisedEntity
} from "../generated/src/Types.gen";

AttestationAggregatorContract_BatchAttested_loader(({ event, context }) => {
  // Add load logic if needed
});

AttestationAggregatorContract_BatchAttested_handler(({ event, context }) => {
  const entity: batchAttestedEntity = {
    id: event.transactionHash + "-" + event.logIndex.toString(),
    batchId: event.params.batchId,
    attestationCount: event.params.attestationCount,
    submitter: event.params.submitter,
    timestamp: event.params.timestamp,
    transactionHash: event.transactionHash,
    blockNumber: BigInt(event.blockNumber),
    blockTimestamp: BigInt(event.blockTimestamp)
  };
  context.batchAttested.set(entity);
});

AttestationAggregatorContract_OwnershipTransferred_loader(({ event, context }) => {
});

AttestationAggregatorContract_OwnershipTransferred_handler(({ event, context }) => {
  const entity: ownershipTransferredEntity = {
    id: event.transactionHash + "-" + event.logIndex.toString(),
    previousOwner: event.params.previousOwner,
    newOwner: event.params.newOwner,
    transactionHash: event.transactionHash,
    blockNumber: BigInt(event.blockNumber),
    blockTimestamp: BigInt(event.blockTimestamp)
  };
  context.ownershipTransferred.set(entity);
});

AttestationAggregatorContract_SubmitterAuthorised_loader(({ event, context }) => {
});

AttestationAggregatorContract_SubmitterAuthorised_handler(({ event, context }) => {
  const entity: submitterAuthorisedEntity = {
    id: event.transactionHash + "-" + event.logIndex.toString(),
    submitter: event.params.submitter,
    authorised: event.params.authorised,
    transactionHash: event.transactionHash,
    blockNumber: BigInt(event.blockNumber),
    blockTimestamp: BigInt(event.blockTimestamp)
  };
  context.submitterAuthorised.set(entity);
});
