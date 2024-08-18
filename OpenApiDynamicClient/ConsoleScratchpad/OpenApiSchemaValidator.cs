using Microsoft.OpenApi.Models;
using Microsoft.OpenApi.Readers;
using System;
using System.IO;
using System.Threading.Tasks;
using System.Linq;
using NJsonSchema;
using Newtonsoft.Json.Linq;
using Microsoft.OpenApi.Writers;
using System.Text;
using System.Collections.Generic;

namespace ConsoleScratchpad;

public class OpenApiSchemaValidator
{
    private readonly IReadOnlyDictionary<string, JsonSchema> _requestBodyJsonSchemas;

    private OpenApiSchemaValidator(IDictionary<string, JsonSchema> jsonSchemas) =>
        _requestBodyJsonSchemas = new Dictionary<string, JsonSchema>(jsonSchemas);

    public static async Task<OpenApiSchemaValidator> CreateAsync(Stream openApiStream)
    {
        // Get the operations with JSON request bodies

        var openApiDocument =
            new OpenApiStreamReader().Read(openApiStream, out _);

        var requestBodyOperations =
            openApiDocument.Paths
                .SelectMany(p => p.Value.Operations)
                .Where(o =>
                    o.Value.RequestBody != null &&
                    o.Value.RequestBody.Content.ContainsKey("application/json"));

        // Convert the OpenAPI schemas to JSON schemas

        var jsonSchemas = new Dictionary<string, JsonSchema>();

        foreach (var operation in requestBodyOperations)
        {
            var openApiSchema =
                operation.Value.RequestBody.Content["application/json"].Schema;
            var jsonSchema =
                await JsonSchema.FromJsonAsync(SerializeToJsonSchema(openApiSchema));
            jsonSchemas.Add(operation.Value.OperationId, jsonSchema);
        }

        return new(jsonSchemas);
    }

    public OpenApiSchemaValidationResult ValidateRequestBodyJson(
        string operationId,
        string bodyJson)
    {
        if (_requestBodyJsonSchemas.TryGetValue(operationId, out var jsonSchema))
        {
            // Validate the JSON against the schema

            var errors = jsonSchema.Validate(JToken.Parse(bodyJson));

            return
                new OpenApiSchemaValidationResult
                {
                    IsValid = errors.Count == 0,
                    Errors = errors.Select(e => $"{e.Path}: {e.Kind}")
                };
        }

        throw new ArgumentException(
            $"Operation does not have a JSON request body: {operationId}",
            nameof(operationId));
    }

    private static string SerializeToJsonSchema(OpenApiSchema schema)
    {
        using var memoryStream = new MemoryStream();
        using (var writer = new StreamWriter(memoryStream))
        {
            var writerSettings =
                new OpenApiWriterSettings()
                {
                    InlineLocalReferences = true,
                    InlineExternalReferences = true,
                };

            schema.SerializeAsV2WithoutReference(
                new OpenApiJsonWriter(writer, writerSettings));
        }

        var schemaJson = Encoding.UTF8.GetString(memoryStream.ToArray());

        return schemaJson;
    }
}