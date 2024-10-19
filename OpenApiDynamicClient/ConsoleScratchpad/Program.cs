using Microsoft.OpenApi.Models;
using Microsoft.OpenApi.Readers;
using Microsoft.OpenApi.Writers;
using Newtonsoft.Json;
using OpenApiDynamicClient;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
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

        //await UseOpenApiSchemaValidatorAsync();

        //await InvokeOpenApiClientV1Async();

        //await InvokeOpenApiClientV2Async();

        //await InvokeGeneratedOpenApiClientAsync();

        await InvokePetstoreHybridOpenApiClientAsync();

        //await InvokePetstoreHybridOpenApiClientBaseAsync();

        Console.WriteLine("Hit return to exit...");
        Console.ReadLine();
    }

    private static async Task InvokePetstoreHybridOpenApiClientAsync()
    {
        var client =
            await PetstoreHybridClient.CreateAsync(
                new Uri("http://petstore.swagger.io"));

        //await client.AddPetAsync(new Pet { Name = "Luna" });

        Pet pet = await client.GetPetByIdAsync(2);
        LogResponse(pet);

        //ICollection<Pet> pets = await client.FindPetsByStatusAsync([Anonymous.Sold]);
        //LogResponse(pets);

        static void LogResponse(object response)
        {
            Console.WriteLine(JsonConvert.SerializeObject(response, Formatting.Indented));
        }
    }

    private static async Task InvokePetstoreHybridOpenApiClientBaseAsync()
    {
        var client =
            await HybridOpenApiClientBase.CreateAsync<PetstoreHybridClientSubclass>(
                new Uri("http://petstore.swagger.io"));

        //await client.AddPetAsync(new Pet { Name = "Luna" });

        Pet pet = await client.GetPetByIdAsync(2);
        LogResponse(pet);

        //ICollection<Pet> pets = await client.FindPetsByStatusAsync([Anonymous.Sold]);
        //LogResponse(pets);

        static void LogResponse(object response)
        {
            Console.WriteLine(JsonConvert.SerializeObject(response, Formatting.Indented));
        }
    }

    private static async Task InvokeGeneratedOpenApiClientAsync()
    {
        try
        {
            HttpClient httpClient = new();

            PetstoreClient petstoreClient = new(httpClient);

            //petstoreClient.BaseUrl = "https://xxx-petstore.swagger.io/v2";

            Pet getPetByIdResponse = await petstoreClient.GetPetByIdAsync(2);
            LogResponse(getPetByIdResponse);

            await petstoreClient.AddPetAsync(new Pet());
        }
        catch (Exception ex)
        {
            Console.WriteLine($"{ex.GetType().FullName}: {ex.Message}");
        }

        static void LogResponse(object response)
        {
            Console.WriteLine(JsonConvert.SerializeObject(response, Formatting.Indented));
        }
    }

    private static async Task UseOpenApiSchemaValidatorAsync()
    {
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

        // What we wanted to do
        //var validator =
        //    await OpenApiSchemaValidator(
        //        new FileStream("petstore.swagger.json", FileMode.Open));

        var validator =
            await OpenApiSchemaValidator.CreateAsync(
                new FileStream("petstore.swagger.json", FileMode.Open));

        //var validationResult =
        //    validator.ValidateRequestBodyJson(operationId: "addPet", bodyJson: petJson);

        var validationResult =
            validator.ValidateRequestBodyJson(operationId: "addPet", bodyJson: "{}");

        if (validationResult.IsValid)
        {
            Console.WriteLine("Request JSON is valid");
        }
        else
        {
            Console.WriteLine(
                $"Request JSON had the following errors: \n- " +
                $"{string.Join("\n- ", validationResult.Errors)}");
        }
    }

    private static async Task InvokeOpenApiClientV1Async()
    {
        var petStoreOpenApiStream =
            new FileStream("petstore.swagger.json", FileMode.Open);
            //new FileStream("invalid.swagger.json", FileMode.Open);

        var petStoreBaseUrl = "https://petstore.swagger.io/v2";

        var petStoreClient = 
            OpenApiClientV1.Create(petStoreOpenApiStream, petStoreBaseUrl);

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

        var unknownPetStoreClient =
            OpenApiClientV1.Create(
                new FileStream("petstore.swagger.json", FileMode.Open), 
                "https://xxx-petstore.swagger.io/v2");

        var unknownGetPetByIdResponse = await unknownPetStoreClient.PerformAsync("getPetById", [("petId", "0")]);
        Console.WriteLine(JsonConvert.SerializeObject(unknownGetPetByIdResponse, Formatting.Indented));
    }

    private static async Task InvokeOpenApiClientV2Async()
    {
        var petStoreOpenApiJson =
            File.ReadAllText("petstore.swagger.json");
        //File.ReadAllText("invalid.swagger.json");

        var petStoreDomain = "https://petstore.swagger.io";

        var petStoreClient =
           await OpenApiClientV2.CreateAsync(petStoreOpenApiJson, new Uri(petStoreDomain));

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

        //var addPetResponse = await petStoreClient.PerformAsync("addPet", [("body", petJson)]);
        //LogResponse(addPetResponse);

        var invalidAddPetResponse = await petStoreClient.PerformAsync("addPet", [("body", "{}")]);
        LogResponse(invalidAddPetResponse);

        var getPetByIdResponse =
            await petStoreClient.PerformAsync("getPetById", [("petId", "2")]);

        if (getPetByIdResponse.IsSuccessful)
        {
            Console.WriteLine(getPetByIdResponse.Payload);
        }
        //LogResponse(getPetByIdResponse);

        //var invalidGetPetByIdResponse1 =
        //    await petStoreClient.PerformAsync("getPetById", []);
        //LogResponse(invalidGetPetByIdResponse1);

        //var invalidGetPetByIdResponse2 =
        //    await petStoreClient.PerformAsync("getPetById", [("petId", "0"), ("petId", "616")]);
        //LogResponse(invalidGetPetByIdResponse2);

        //var invalidGetPetByIdResponse3 =
        //    await petStoreClient.PerformAsync("getPetById", [("petId", "Banana")]);
        //LogResponse(invalidGetPetByIdResponse3);

        //var findPetsByStatusResponse =
        //    await petStoreClient.PerformAsync(
        //        "findPetsByStatus", [("status", "available"), ("status", "pending")]);
        //LogResponse(findPetsByStatusResponse);

        //var defaultFindPetsByStatusResponse =
        //    await petStoreClient.PerformAsync("findPetsByStatus", []);
        //LogResponse(defaultFindPetsByStatusResponse);

        //var invalidPetsByStatusResponse =
        //    await petStoreClient.PerformAsync(
        //        "findPetsByStatus", [("status", "apple"), ("status", "banana")]);
        //LogResponse(invalidPetsByStatusResponse);

        //var unknownPetStoreClient =
        //    await OpenApiClientV2.CreateAsync(
        //        petStoreOpenApiJson, new Uri("https://xxx-petstore.swagger.io"));

        //var unknownGetPetByIdResponse = 
        //    await unknownPetStoreClient.PerformAsync("getPetById", [("petId", "0")]);
        //LogResponse(unknownGetPetByIdResponse);

        static void LogResponse(JsonResponse response)
        {
            Console.WriteLine(JsonConvert.SerializeObject(response, Formatting.Indented));
        }
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

            using var fileStream = new FileStream(outputPath, FileMode.CreateNew);
            using var writer = new StreamWriter(fileStream);

            var writerSettings =
                new OpenApiWriterSettings()
                {
                    InlineLocalReferences = true,
                    InlineExternalReferences = true
                };

            schemaEntry.Value.SerializeAsV2WithoutReference(
                new OpenApiJsonWriter(writer, writerSettings));
        }
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
