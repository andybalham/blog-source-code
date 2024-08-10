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
    static async Task Main(string[] args)
    {
        //await NJsonSchemaValidator1();

        //await ExportComponentSchemas();

        //await NJsonSchemaValidator2();

        await InvokeOpenApiClientAsync();

        Console.WriteLine("Hit return to exit...");
        Console.ReadLine();
    }

    private static async Task InvokeOpenApiClientAsync()
    {
        var petStoreOpenApiStream =
            new FileStream("petstore.swagger.json", FileMode.Open);

        var petStoreBaseUrl = "https://petstore.swagger.io/v2";

        var petStoreClient = OpenApiClient.Create(petStoreOpenApiStream, petStoreBaseUrl);

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

        var addPetResponse = await petStoreClient.PerformAsync("addPet", [("body", petJson)]);
        Console.WriteLine(JsonConvert.SerializeObject(addPetResponse, Formatting.Indented));

        var invalidAddPetResponse = await petStoreClient.PerformAsync("addPet", [("body", "{}")]);
        Console.WriteLine(JsonConvert.SerializeObject(invalidAddPetResponse, Formatting.Indented));

        var getPetByIdResponse = await petStoreClient.PerformAsync("getPetById", [("petId", "0")]);
        Console.WriteLine(JsonConvert.SerializeObject(getPetByIdResponse, Formatting.Indented));

        var invalidGetPetByIdResponse = await petStoreClient.PerformAsync("getPetById", []);
        Console.WriteLine(JsonConvert.SerializeObject(invalidGetPetByIdResponse, Formatting.Indented));

        //var findPetsByStatusResponse =
        //    await petStoreClient.PerformAsync(
        //        "findPetsByStatus", [("status", "available"), ("status", "pending")]);
        //Console.WriteLine(JsonConvert.SerializeObject(findPetsByStatusResponse, Formatting.Indented));

        //var defaultFindPetsByStatusResponse =
        //    await petStoreClient.PerformAsync("findPetsByStatus", []);
        //Console.WriteLine(JsonConvert.SerializeObject(defaultFindPetsByStatusResponse, Formatting.Indented));
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
