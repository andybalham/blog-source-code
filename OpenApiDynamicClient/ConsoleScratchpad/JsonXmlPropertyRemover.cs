using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json.Linq;

namespace ConsoleScratchpad;

public static class JsonXmlPropertyRemover
{
    public static string RemoveXmlProperties(string jsonString)
    {
        // Parse the JSON string into a JToken
        JToken token = JToken.Parse(jsonString);

        // Remove all 'xml' properties recursively
        RemoveXmlPropertiesRecursive(token);

        // Convert the modified JToken back to a JSON string
        return token.ToString();
    }

    private static void RemoveXmlPropertiesRecursive(JToken token)
    {
        if (token.Type == JTokenType.Object)
        {
            var obj = (JObject)token;
            obj.Remove("xml");

            foreach (var property in obj.Properties())
            {
                RemoveXmlPropertiesRecursive(property.Value);
            }
        }
        else if (token.Type == JTokenType.Array)
        {
            var array = (JArray)token;
            foreach (var item in array)
            {
                RemoveXmlPropertiesRecursive(item);
            }
        }
    }
}