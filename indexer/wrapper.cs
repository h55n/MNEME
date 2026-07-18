using System;
using System.Diagnostics;

class Program
{
    static int Main(string[] args)
    {
        string exeName = AppDomain.CurrentDomain.FriendlyName; // e.g., "npm.exe" or "pnpm.exe"
        string targetCmd = exeName.Replace(".exe", ".cmd");

        Process process = new Process();
        process.StartInfo.FileName = targetCmd;
        
        // Properly escape arguments with spaces
        string arguments = "";
        for (int i = 0; i < args.Length; i++)
        {
            if (args[i].Contains(" "))
                arguments += "\"" + args[i] + "\" ";
            else
                arguments += args[i] + " ";
        }
        
        process.StartInfo.Arguments = arguments.TrimEnd();
        process.StartInfo.UseShellExecute = false;
        
        try {
            process.Start();
            process.WaitForExit();
            return process.ExitCode;
        } catch (Exception ex) {
            Console.WriteLine("Error running " + targetCmd + ": " + ex.Message);
            return 1;
        }
    }
}
