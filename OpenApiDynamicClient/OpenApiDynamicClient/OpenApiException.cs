using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.Serialization;
using System.Text;
using System.Threading.Tasks;

namespace OpenApiDynamicClient;

public class OpenApiException : Exception
{
    public OpenApiException()
    {
    }

    public OpenApiException(string message) : base(message)
    {
    }

    public OpenApiException(string message, Exception innerException) : base(message, innerException)
    {
    }

    protected OpenApiException(SerializationInfo info, StreamingContext context) : base(info, context)
    {
    }
}
