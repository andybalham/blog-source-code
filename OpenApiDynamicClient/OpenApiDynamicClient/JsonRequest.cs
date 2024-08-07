﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OpenApiDynamicClient;

public class JsonRequest
{
    public IEnumerable<ApiParameter> PathParameters { get; set; }
    public IEnumerable<ApiParameter> QueryParameters { get; set; }
    public string BodyJson { get; set; }
}
