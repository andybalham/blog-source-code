using Microsoft.OpenApi.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OpenApiDynamicClient;

internal class ClientOperation // TODO: Change the name?
{
    public OpenApiOperation Operation { get; }
    public OperationType OperationType { get; }
    public string Path { get; }
    // Request schema?
    // Response schemas by response?
    // HasRequestBody?
    // IsRequestBodyRequired?
}
