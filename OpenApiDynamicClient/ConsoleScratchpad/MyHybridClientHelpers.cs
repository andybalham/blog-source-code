using System;

namespace ConsoleScratchpad;

public static class MyHybridClientHelpers
{
    public static void LogFailure(string operationId)
    {
        Console.WriteLine($"{operationId} failed");
    }

    public static void LogSuccess(string operationId)
    {
        Console.WriteLine($"{operationId} succeeded");
    }
}