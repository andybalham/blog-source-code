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

## Remote debugging (eventually)

To tell the truth, I could have saved myself quite a bit of frustration if I had read the [remote debugging](https://learn.microsoft.com/en-us/azure/azure-functions/functions-develop-vs?pivots=isolated#remote-debugging) section of the Microsoft [Develop Azure Functions using Visual Studio](https://learn.microsoft.com/en-us/azure/azure-functions/functions-develop-vs?pivots=isolated) guide. However, here is the tale of my more circuitous route to success.

My first attempt was the most obvious option. That is, to use the option in the Publish page to attach a debugger.

![Visual Studio option in Publish page to attach debugger](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-02-deploying-my-first-function/remote-debugging-attach-from-publish.png?raw=true)

This then indicated some activity, but ultimately no attachment occurred. Undeterred, I searched the internet and found the blog post [How to remote debug an HTTP trigger Azure Functions in Visual Studio 2022](https://turbo360.com/blog/remote-debugging-azure-functions-in-visual-studio-2022). Amongst the steps mentioned, was to enable remote debugging in the Azure portal. However, when I looked I found this was already enabled.

![Function App configuration in Azure portal to enable remote debugging](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-02-deploying-my-first-function/remote-debugging-enable-on-portal.png?raw=true)

With hindsight, what I suspect had happened was that the 'Attach Debugger' operation had enabled this. The [Microsoft article](https://learn.microsoft.com/en-us/azure/azure-functions/functions-develop-vs?pivots=isolated#disable-remote-debugging) advises the following:

> After you're done remote debugging your code, you should disable remote debugging in the Azure portal. Remote debugging is automatically disabled after 48 hours, in case you forget.

The next thing I tried was to update the publish settings. The configuration was set to 'Release', so I changed it to 'Debug'.

TODO: I updated the settings in the 'Publish' page...
![Visual Studio publish settings](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-02-deploying-my-first-function/remote-debugging-publish-settings.png?raw=true)

Following the instructions in the blog post, I tried manually attaching to the remote process and was prompted for credentials to connect.

![Azure portal prompting for credentials to attach remote debugger](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-02-deploying-my-first-function/remote-debugging-credentials-prompt.png?raw=true)

The credentials required had to be downloaded from the Azure portal, via a publish profile.

![Option to download publish profile from Azure portal](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-02-deploying-my-first-function/remote-debugging-download-publish-profile.png?raw=true)

In the downloaded file, I found the details required in the 'Zip Deploy' element.

![Downloaded publish profile for zip deploy](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-02-deploying-my-first-function/remote-debugging-downloaded-publish-profile.png?raw=true)

After a few tries, I was finally able to see the processes. So I followed the blog post and tried attaching to the `w3wp.exe` process.

![Selecting the remote w3wp process to attach the debugger](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-02-deploying-my-first-function/remote-debugging-remote-w3wp.png?raw=true)

However, Visual Studio still reported that my breakpoints were not active.

![Visual Studio showing no symbols loaded](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-02-deploying-my-first-function/remote-debugging-no-symbols-loaded.png?raw=true)

I wondered for a short while if remote debugging was not supported for the [isolated worker model](https://learn.microsoft.com/en-us/azure/azure-functions/dotnet-isolated-process-guide?tabs=windows). Then it dawned on me that it wasn't the `w3wp.exe` process that I should be attaching to, it was the isolated `dotnet.exe` process instead.

![Selecting the remote dotnet process to attach the debugger](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-02-deploying-my-first-function/remote-debugging-remote-dotnet-process.png?raw=true)

Once I had done this, everything fell into place. My breakpoint was hit and I could step through my function remotely.

![Visual Studio showing breakpoint being hit](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-02-deploying-my-first-function/remote-debugging-breakpoint-hit.png?raw=true)

As mentioned, I could have avoided this, as the Microsoft article clearly states:

> Check **Show process from all users** and then choose **dotnet.exe** and select **Attach**.

## A peek at the internals

TODO: Mention gRPC worker with screenshots...

## Summary

TODO

