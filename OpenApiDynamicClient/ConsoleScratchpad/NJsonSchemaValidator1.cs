using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.OpenApi.Readers;
using Newtonsoft.Json.Linq;
using NJsonSchema;
using System.IO;

namespace ConsoleScratchpad;

public class NJsonSchemaValidator1
{
    public async Task ValidateJsonAgainstSwaggerSchemaAsync(string swaggerFilePath, string operationId, string jsonToValidate)
    {
        // Read the Swagger file
        var openApiDocument = new OpenApiStreamReader().Read(File.OpenRead(swaggerFilePath), out var diagnostic);

        // Find the operation by OperationId
        var operation = openApiDocument.Paths
            .SelectMany(p => p.Value.Operations)
            .FirstOrDefault(o => o.Value.OperationId == operationId);

        if (operation.Value == null)
        {
            Console.WriteLine($"Operation with ID '{operationId}' not found.");
            return;
        }

        // Get the request body schema
        if (operation.Value.RequestBody != null &&
            operation.Value.RequestBody.Content.TryGetValue("application/json", out var mediaType))
        {
            var openApiSchema = mediaType.Schema;

            // Convert OpenApiSchema to JSON Schema
            var schemaData = Newtonsoft.Json.JsonConvert.SerializeObject(openApiSchema);
            var jsonSchema = await JsonSchema.FromJsonAsync(schemaData);

            // Parse the JSON to validate
            var jsonToken = JToken.Parse(jsonToValidate);

            // Validate the JSON against the schema
            var errors = jsonSchema.Validate(jsonToken);

            if (errors.Count == 0)
            {
                Console.WriteLine("JSON is valid according to the schema.");
            }
            else
            {
                Console.WriteLine("JSON is not valid. Errors:");
                foreach (var error in errors)
                {
                    Console.WriteLine($"- {error.Path}: {error.Kind}");
                }
            }
        }
        else
        {
            Console.WriteLine("No JSON schema found for the request body.");
        }
    }
}