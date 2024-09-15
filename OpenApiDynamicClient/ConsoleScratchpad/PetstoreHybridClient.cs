using OpenApiDynamicClient;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace ConsoleScratchpad;

public class PetstoreHybridClient
{
    #region Member variables, constructor, and factory method

    private readonly OpenApiClientV2 _client;

    private PetstoreHybridClient(OpenApiClientV2 client)
    {
        _client = client;

        _client.OnSuccess = 
            (string o, IEnumerable<(string, string)> p, JsonResponse r) =>
                {
                    HybridClientHelpers.LogSuccess(o);
                    HybridOpenApiClient.OnSuccess(o, p, r);
                };

        _client.OnFailure =
            (string o, IEnumerable<(string, string)> p, JsonResponse r) =>
            {
                HybridClientHelpers.LogFailure(o);
                HybridOpenApiClient.OnFailure(o, p, r);
            };
    }

    public static async Task<PetstoreHybridClient> CreateAsync(Uri domainUri)
    {
        return 
            await HybridOpenApiClient.CreateAsync(
                client => new PetstoreHybridClient(client),
                domainUri);
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
