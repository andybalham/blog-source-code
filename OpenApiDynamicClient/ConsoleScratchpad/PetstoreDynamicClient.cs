using Newtonsoft.Json;
using OpenApiDynamicClient;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ConsoleScratchpad
{
    // TODO: How can we have a base DynamicClient? Would we want to?

    public class PetstoreDynamicClient
    {
        private readonly OpenApiClientV2 _client;

        private static readonly JsonSerializerSettings _serializerSettings =
            new()
            {
                MissingMemberHandling = MissingMemberHandling.Ignore,
                NullValueHandling = NullValueHandling.Ignore
            };

        private PetstoreDynamicClient(OpenApiClientV2 client)
        {
            _client = client;
        }

        public static async Task<PetstoreDynamicClient> CreateAsync(Uri domainUri)
        {
            var client = 
                await OpenApiClientV2.CreateAsync(
                    File.ReadAllText("petstore.swagger.json"), domainUri);

            client.OnSuccess = OnSuccess;
            client.OnFailure = OnFailure;

            return new PetstoreDynamicClient(client);
        }

        private static void OnSuccess(JsonResponse response)
        {
            // TODO: Add logging
        }

        private static void OnFailure(JsonResponse response)
        {
            // TODO: Add logging and raise specific exception
            throw new Exception(string.Join("\n", response.FailureReasons));
        }

        private static string Serialize(Pet body)
        {
            return JsonConvert.SerializeObject(body, _serializerSettings);
        }

        private static T Deserialize<T>(JsonResponse response)
        {
            return JsonConvert.DeserializeObject<T>(response.Payload, _serializerSettings);
        }

        public async Task AddPetAsync(Pet body)
        {
            await _client.PerformAsync("addPet", [("body", Serialize(body))]);
        }

        public async Task<Pet> GetPetByIdAsync(long petId)
        {
            var response =
                await _client.PerformAsync("getPetById", [("petId", petId.ToString())]);

            return Deserialize<Pet>(response);
        }
    }
}
