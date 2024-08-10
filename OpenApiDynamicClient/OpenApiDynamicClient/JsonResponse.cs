using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading.Tasks;

namespace OpenApiDynamicClient;

public class JsonResponse
{
    public bool IsSuccessful { get; set; }
    public HttpStatusCode? HttpStatusCode { get; set; }
    public string ResponseStatus { get; set; }
    public string Body { get; set; }
    public string FailureReason { get; internal set; }
}
