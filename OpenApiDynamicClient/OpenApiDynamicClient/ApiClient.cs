using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OpenApiDynamicClient;

public class ApiClient
{
    public ApiClient(
        Stream petStoreOpenApiStream,
        IRequestMapper petStoreRequestMapper)
    {
    }

    public JsonResponse InvokeOperation(string v, string sourceJson)
    {
        throw new NotImplementedException();
    }
}

