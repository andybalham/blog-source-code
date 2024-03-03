# Observations on Azure Functions

- Old vs New (Isolated worker process)
- Local development experience. I.e., F5 to run vs. Lambda function deployment

## Observations that would be useful for myself and interesting for other readers?

- Old vs New (Isolated worker process)

  - [Guide for running C# Azure Functions in an isolated worker process](https://learn.microsoft.com/en-us/azure/azure-functions/dotnet-isolated-process-guide?tabs=windows)
  - [Differences between the isolated worker model and the in-process model for .NET on Azure Functions](https://learn.microsoft.com/en-us/azure/azure-functions/dotnet-isolated-in-process-differences)

- Local development experience. I.e., F5 to run vs. Lambda function deployment

  - [Create your first C# function in Azure using Visual Studio](https://learn.microsoft.com/en-us/azure/azure-functions/functions-create-your-first-function-visual-studio)

- Logging (I.e., how to get debug locally)

  - See `HostBuilder` for doing all the configuring

- Unit testing (TODO)

  - [Unit test an Azure Function](https://learn.microsoft.com/en-us/training/modules/develop-test-deploy-azure-functions-with-visual-studio/6-unit-test-azure-functions))

- Remote debugging (TODO: get working)

- Deploying (TODO)

## Notes

- The 'New Azure Function' template is for the older model

- The following would be interesting to discuss. Is it worth mocking the SDK if you use ports and adaptors?
  - [Unit testing and mocking with the Azure SDK for .NET](https://learn.microsoft.com/en-us/dotnet/azure/sdk/unit-testing-mocking?tabs=csharp)

### Purpose of `.pubxml` File

The `.pubxml` file, short for "Publish XML", is a file used in Visual Studio as part of the Web Publishing Pipeline (WPP). It contains settings and configurations for deploying a web application, such as an ASP.NET app, to various destinations like IIS, Azure, or other hosting providers. Here's an overview of its purpose and why it is often best not to check it into source control:

1. **Deployment Configuration**: The `.pubxml` file holds specific settings for deploying your application, like connection strings, deployment methods (Web Deploy, FTP, etc.), and target URLs.

2. **Environment-Specific Settings**: It can contain environment-specific details, such as different settings for development, staging, and production environments.

3. **Custom Publishing Steps**: You can define custom actions in the `.pubxml` file to run during the publishing process, like database script execution or file transformations.

#### Reasons Not to Check `.pubxml` into Source Control

1. **Sensitive Information**: The `.pubxml` file can contain sensitive information like usernames, passwords, and connection strings. Checking this file into source control, especially public repositories, can expose sensitive data.

2. **Environment Differences**: Each developer or environment (development, staging, production) might require different deployment settings. Checking in `.pubxml` files can lead to conflicts and inconsistencies among team members or deployment environments.

3. **Personalization**: Developers often have personalized settings that are not relevant or suitable for other team members. These personal preferences should not be imposed on the entire team.

4. **Security Best Practices**: It's a security best practice to keep deployment settings, particularly for production, out of source control. Deployment configurations should be managed securely and separately from the codebase.

#### Best Practices

- **Use `.pubxml.user` for Personal Settings**: For personal or user-specific settings, you should use the `.pubxml.user` file, which is meant to be user-specific and is not checked into source control by default.

- **Environment Variables and Secrets Management**: Instead of hardcoding sensitive information in `.pubxml`, use environment variables or a secure secrets management system, especially for credentials and connection strings.

- **`.gitignore` or Similar**: Ensure your source control ignore file (like `.gitignore` for Git) includes `.pubxml` files to prevent accidental check-ins.

- **Parameterization**: For settings that vary between environments, consider using parameterization. Parameters can be set during deployment without storing environment-specific values in source control.

#### Conclusion

The `.pubxml` file plays an important role in configuring the deployment of web applications. However, due to the potential inclusion of sensitive data and personalized settings, it is generally best practice to exclude this file from source control and handle deployment configurations through more secure and collaborative means.
