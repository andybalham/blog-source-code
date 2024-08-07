using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading.Tasks;

namespace OpenApiDynamicClient;

public class JsonResponse
{
    // TODO: Should we have a ResponseStatus? E.g., Completed, Error, etc
    public bool IsSuccessful { get; set; }
    public HttpStatusCode? HttpStatusCode { get; set; }
    public string ResponseDescription { get; set; }
    public string Body { get; set; }
}
