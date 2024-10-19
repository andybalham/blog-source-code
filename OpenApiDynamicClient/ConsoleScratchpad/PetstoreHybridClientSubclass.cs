using OpenApiDynamicClient;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace ConsoleScratchpad;

public class PetstoreHybridClientSubclass : HybridOpenApiClientBase
{
    #region Overrides

    protected override void OnSuccess(
        string operationId,
        IEnumerable<(string, string)> parameters,
        JsonResponse response)
    {
        MyHybridClientHelpers.LogSuccess(operationId, response);
        base.OnSuccess(operationId, parameters, response);
    }

    protected override void OnFailure(
        string operationId,
        IEnumerable<(string, string)> parameters,
        JsonResponse response)
    {
        MyHybridClientHelpers.LogFailure(operationId, response);
        base.OnFailure(operationId, parameters, response);
    }

    #endregion

    #region API operations

    public async Task AddPetAsync(
        Pet body)
    {
        await Client.PerformAsync(
            "addPet", 
            [
                ("body", Serialize(body)),
            ]);
    }

    public async Task<Pet> GetPetByIdAsync(
        long petId)
    {
        var response =
            await Client.PerformAsync(
                "getPetById", 
                [
                    ("petId", Serialize(petId)),
                ]);

        return Deserialize<Pet>(response);
    }

    public async Task<ICollection<Pet>> FindPetsByStatusAsync(
        IEnumerable<Anonymous> status)
    {
        // Q: How would we know to do ..Select and not just serialize the parameter?
        // A: "parameters": [ { "type": "array" } ]

        var response = 
            await Client.PerformAsync(
                "findPetsByStatus", 
                [
                    ..status.Select(s => ("status", Serialize(s))),
                ]);

        return Deserialize<ICollection<Pet>>(response);
    }

    #endregion
}
