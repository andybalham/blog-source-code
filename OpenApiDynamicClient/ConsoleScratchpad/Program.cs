using Microsoft.OpenApi.Models;
using Microsoft.OpenApi.Readers;
using Microsoft.OpenApi.Writers;
using Newtonsoft.Json;
using OpenApiDynamicClient;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ConsoleScratchpad;

internal class Program
{
    static void Main(string[] args)
    {
        //await NJsonSchemaValidator1();

        //await ExportComponentSchemas();

        //await NJsonSchemaValidator2();

        InvokeClient();

        Console.WriteLine("Hit return to exit...");
        Console.ReadLine();
    }

    private static async void InvokeClient()
    {
        var petStoreDefinitionStream = 
            new FileStream("petstore.swagger.json", FileMode.Open);
        var petStoreBaseUrl = "https://petstore.swagger.io/v2";

        var petJson = """
            {
                "id": 0,
                "category": {
                    "id": 0,
                    "name": "string"
                },
                "name": "doggie",
                "photoUrls": [
                    "string"
                ],
                "tags": [
                    {
                        "id": 0,
                        "name": "string"
                    }
                ],
                "status": "available"
            }
            """;

        var petStoreClient = 
            ApiClient.Create(petStoreDefinitionStream, petStoreBaseUrl);

        var response = 
            await petStoreClient.PerformOperationAsync(
                "addPet",
                [ 
                    new ApiParameter("body", petJson)
                ]);

        Console.WriteLine(JsonConvert.SerializeObject(response, Formatting.Indented));
    }

    private static async Task ExportComponentSchemas()
    {
        // https://stackoverflow.com/questions/71960630/get-the-json-schemas-from-a-large-openapi-document-or-using-newtonsoft-and-reso

        var file = new FileInfo("swagger.json");
        var outputDirectory = new DirectoryInfo("SwaggerOutput");

        Console.WriteLine($"Processing file: {file.FullName}");
        var fileNameWithoutExtension = Path.GetFileNameWithoutExtension(file.FullName);

        var reader = new OpenApiStreamReader();
        var result = await reader.ReadAsync(new FileStream(file.FullName, FileMode.Open));

        foreach (var schemaEntry in result.OpenApiDocument.Components.Schemas)
        {
            var schemaFileName = schemaEntry.Key + ".json";
            Console.WriteLine("Creating " + schemaFileName);

            var outputDir = 
                Path.Combine(outputDirectory.FullName, fileNameWithoutExtension);
            if (!Directory.Exists(outputDir))
            {
                Directory.CreateDirectory(outputDir);
            }
            var outputPath = Path.Combine(outputDir, schemaFileName + "-Schema.json");

            SerializeSchema(schemaEntry, outputPath);
        }
    }

    private static void SerializeSchema(KeyValuePair<string, OpenApiSchema> schemaEntry, string outputPath)
    {
        FileStream fileStream;
        StreamWriter writer;

        fileStream = new FileStream(outputPath, FileMode.CreateNew);
        var writerSettings = new OpenApiWriterSettings() { InlineLocalReferences = true, InlineExternalReferences = true };
        writer = new StreamWriter(fileStream);
        schemaEntry.Value.SerializeAsV2WithoutReference(new OpenApiJsonWriter(writer, writerSettings));
    }

    private static async Task NJsonSchemaValidator1()
    {
        /*
            Newtonsoft.Json.JsonSerializationException
            HResult=0x80131500
            Message=Self referencing loop detected for property 'HostDocument' with type 'Microsoft.OpenApi.Models.OpenApiDocument'. Path 'Properties.category.Reference.HostDocument.Paths['/pet/{petId}/uploadImage'].Operations.Post.Tags[0].Reference'.
            Source=Newtonsoft.Json
         */

        var validator = new NJsonSchemaValidator1();
        string swaggerFilePath = "swagger.json";
        string operationId = "addPet";  // Replace with the actual operation ID
        string jsonToValidate = """
        {
            "id": 0,
            "category": {
                "id": 0,
                "name": "string"
            },
            "name": "doggie",
            "photoUrls": [
                "string"
            ],
            "tags": [
                {
                    "id": 0,
                    "name": "string"
                }
            ],
            "status": "available"
        }
        """;

        await validator.ValidateJsonAgainstSwaggerSchemaAsync(swaggerFilePath, operationId, jsonToValidate);
    }

    private static async Task NJsonSchemaValidator2()
    {
        var validator = new NJsonSchemaValidator2();
        string swaggerFilePath = "swagger.json";
        string operationId = "addPet";
        string jsonToValidate = """
        {
            "id": 0,
            "category": {
                "id": 0,
                "name": "string"
            },
            "name": "doggie",
            "photoUrls": [
                "string"
            ],
            "tags": [
                {
                    "id": 0,
                    "name": "string"
                }
            ],
            "status": "available"
        }
        """;

        await validator.ValidateJsonAgainstSwaggerSchemaAsync(swaggerFilePath, operationId, jsonToValidate);
    }
}
