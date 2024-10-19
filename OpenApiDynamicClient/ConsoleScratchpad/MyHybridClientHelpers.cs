using OpenApiDynamicClient;
using System;

namespace ConsoleScratchpad;

public static class MyHybridClientHelpers
{
    public static void LogFailure(string operationId, JsonResponse response)
    {
        Console.WriteLine(
            $"{operationId} failed in {response.ElapsedMilliseconds}ms");
    }

    public static void LogSuccess(string operationId, JsonResponse response)
    {
        Console.WriteLine(
            $"{operationId} succeeded failed in {response.ElapsedMilliseconds}ms");
    }
}