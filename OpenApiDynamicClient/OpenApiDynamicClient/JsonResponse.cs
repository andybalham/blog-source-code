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
    public string HttpResponseStatus { get; internal set; }
    public HttpStatusCode? HttpStatusCode { get; internal set; }
    public string BodyJson { get; internal set; }
    public IEnumerable<string> FailureReasons { get; internal set; }
}
