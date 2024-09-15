using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Runtime.Serialization;
using System.Text;
using System.Threading.Tasks;

namespace OpenApiDynamicClient;

public class OpenApiException : Exception
{
    public HttpStatusCode? HttpStatusCode { get; private set; }

    public OpenApiException()
    {
    }

    public OpenApiException(string message) : base(message)
    {
    }

    public OpenApiException(string message, HttpStatusCode httpStatusCode) : base(message)
    {
        this.HttpStatusCode = httpStatusCode;
    }

    public OpenApiException(string message, Exception innerException) : base(message, innerException)
    {
    }

    protected OpenApiException(SerializationInfo info, StreamingContext context) : base(info, context)
    {
    }
}
