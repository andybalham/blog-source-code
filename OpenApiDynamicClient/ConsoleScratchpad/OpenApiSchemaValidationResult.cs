using System.Collections;
using System.Collections.Generic;

namespace ConsoleScratchpad;

public record OpenApiSchemaValidationResult
{
    public bool IsValid { get; internal set; }
    public IEnumerable<string> Errors { get; internal set; }
}