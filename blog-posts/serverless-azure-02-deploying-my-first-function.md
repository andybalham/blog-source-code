# Deploying my first function

TODO: An overview of what we are trying to achieve in the series and what we have done so far.

## It's all gone south

Ultimately, I want to deploy the final application using infrastructure as code. However, first I thought I would try the ClickOps approach. This is done by right-clicking on the project and selecting 'Publish'.

![Visual Studio option to publish an Azure Function](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-02-deploying-my-first-function/publish-from-vs.png?raw=true)

The first time through it did successfully publish the function to Azure. However, I did notice something odd in the wizard. At one point it asks you to create a new Functions instance. The odd thing is that it only gave me one option for the storage, and that option was on the other side of the world.

![Creating a function instance with storage in Australia Central](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-02-deploying-my-first-function/function-app-australia-storage.png?raw=true)

I thought that perhaps it was perhaps a user interface issue. Surely, it wouldn't create resources 12,000 miles apart. I clicked to continue and then looked at the created resources.

![Resource group view showing storage in Australia Central](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-02-deploying-my-first-function/resources-australia-central.png?raw=true)

Unfortunately, it was very much the case that resources could not have been more geographically disparate if you tried.

## Back to the Portal

Try as I might, I could not get the Visual Studio wizard to create a set of geographically-sensible resources. Instead, I went into the Azure portal and selected the option to create a Function App. This did allow me full control over the location of any created resources. In particular, the Application Insights could now be located in the UK.

![The monitoring page of the portal Function App wizard](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-02-deploying-my-first-function/app-insights-closer-to-home.png?raw=true)

Once the Function App had been created via the portal, I could select it in the Visual Studio wizard.

![Visual Studio publish wizard showing manually-created resources](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-02-deploying-my-first-function/portal-created-function-app.png?raw=true)

Once this wizard had completed, and generated a few interesting files, I was presented by the 'Publish' button below.

![Publish option within Visual Studio](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-02-deploying-my-first-function/azure-publish-profile.png?raw=true)

Pressing this started the deployment and, before long, I had my function deployed into the cloud and ready to be tested.

## Debugging the deployment (TODO: Better name)

Full of excitement, I fired off a request to the function and got the following response.

```text
HTTP/1.1 500 Internal Server Error
```

Now, I could test the function locally to recreate and debug the issue. However, it struck me that it would be an opportunity to look at what diagnostics are available in the cloud. With this in mind, I opened the Azure portal and went into the function app overview. Here, I was presented with a list of functions.

![Azure portal Function list shown in Function App overview](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-02-deploying-my-first-function/app-overview-function-list.png?raw=true)

After selecting the function, I was then given the following developer options.

![Azure portal Function developer options](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-02-deploying-my-first-function/function-app-developer-options.png?raw=true)

Out of curiosity, I selected the 'Integration' option and got a diagram showing how the triggers and inputs for the function and the outputs from the function. There was also a warning me that I could not edit my function in the portal, as I had chosen to use the isolated worker model. If such editing is important to you, then this is perhaps a reason not to choose that model. For me, I would rather not have the option.

![Azure portal Function App integration overview](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-02-deploying-my-first-function/function-app-integration-overview.png?raw=true)

Selecting 'Monitor' resulted in a promising list of function invocations. At the top of the list was my failure.

![Azure portal Function App invocation list](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-02-deploying-my-first-function/function-app-invocation-list.png?raw=true)

Clicking on the hyperlinked date brought up the details that I was looking for.

![Azure portal Function App invocation details](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-02-deploying-my-first-function/function-app-invocation-details.png?raw=true)

Here was the exception stack trace that clearly showed that the error lay in the code I had written. Well, the code I had copied from ChatGPT. Clearly, I had not been as diligent as I should have been with my testing.

There was also an option to run a query in Application Insights. Clicking this caused the following query to run and return all the relevant entries. Note how the query uses the 'union' operator to combine data from both the `traces` and `exceptions` tables.

![Azure portal Function App invocation shown in App Insights](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-02-deploying-my-first-function/function-app-invocation-app-insights.png?raw=true)

For completeness, I open the 'Logs' page. This appeared to be some sort of realtime view of the logs. I ran my faulty function again and saw the following entries appear.

![Azure portal Function App Monitor Logs](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-02-deploying-my-first-function/function-app-monitor-logs.png?raw=true)

By default, it doesn't appear to log the actual exception. This seems to rather limit its usage, as the other views capture the full details. However, it might have some uses that are not apparent to me at the moment. It is good to know it is there though.

Now I knew what the problem was, I could go and fix it. But before that, there was one more thing I wanted to try and that was remote debugging.

## Remote debugging

TODO

---

TODO:

- Show deployment successful with API key
- Show debugging with monitor (recreate issue)
- Have a look at what was created

Interesting to see that there is two steps:

1. Create somewhere for the function to be deployed to
1. Deploy the function to that place

![Output from the Monitor page in the Azure portal](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-02-deploying-my-first-function/azure-function-monitor.png?raw=true)

---

## Observations that would be useful for myself and interesting for other readers?

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
