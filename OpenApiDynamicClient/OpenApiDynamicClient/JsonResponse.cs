using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading.Tasks;

namespace OpenApiDynamicClient;

public record JsonResponse
{
    public bool IsSuccessful { get; internal set; }
    public string ResponseStatus { get; internal set; }
    public HttpStatusCode? HttpStatusCode { get; internal set; }
    public string Payload { get; internal set; }
    public IEnumerable<string> FailureReasons { get; internal set; }
    public Exception Exception { get; internal set; }
    public long ElapsedMilliseconds { get; internal set; }
}
