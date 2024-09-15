using OpenApiDynamicClient;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace ConsoleScratchpad;

public class PetstoreHybridOpenApiClient
{
    #region Member variables, constructor, and factory method

    private readonly OpenApiClientV2 _client;

    private PetstoreHybridOpenApiClient(OpenApiClientV2 client)
    {
        _client = client;

        _client.OnSuccess = 
            (string o, IEnumerable<(string, string)> p, JsonResponse r) =>
                {
                    OnSuccess(o);
                    HybridOpenApiClient.OnSuccess(o, p, r);
                };

        _client.OnFailure =
            (string o, IEnumerable<(string, string)> p, JsonResponse r) =>
            {
                OnFailure(o);
                HybridOpenApiClient.OnFailure(o, p, r);
            };
    }

    public static async Task<PetstoreHybridOpenApiClient> CreateAsync(Uri domainUri)
    {
        return await HybridOpenApiClient.CreateAsync(
            client => new PetstoreHybridOpenApiClient(client),
            File.ReadAllText("petstore.swagger.json"),
            domainUri);
    }

    #endregion

    #region Customisations

    private void OnSuccess(string operationId)
    {
        Console.WriteLine($"{operationId} succeeded");
    }

    private void OnFailure(string operationId)
    {
        Console.WriteLine($"{operationId} failed");
    }

    #endregion

    #region API operations

    public async Task AddPetAsync(
        Pet body)
    {
        await _client.PerformAsync(
            "addPet", 
            [
                ("body", HybridOpenApiClient.Serialize(body)),
            ]);
    }

    public async Task<Pet> GetPetByIdAsync(
        long petId)
    {
        var response =
            await _client.PerformAsync(
                "getPetById", 
                [
                    ("petId", HybridOpenApiClient.Serialize(petId)),
                ]);

        return HybridOpenApiClient.Deserialize<Pet>(response);
    }

    public async Task<ICollection<Pet>> FindPetsByStatusAsync(
        IEnumerable<Anonymous> status)
    {
        // Q: How would we know to do ..Select and not just serialize the parameter?
        // A: "parameters": [ { "type": "array" } ]

        var response = 
            await _client.PerformAsync(
                "findPetsByStatus", 
                [
                    ..status.Select(s => ("status", HybridOpenApiClient.Serialize(s))),
                ]);

        return HybridOpenApiClient.Deserialize<ICollection<Pet>>(response);
    }

    #endregion
}
