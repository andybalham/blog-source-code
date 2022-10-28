Logging is a subject close to my heart. Good quality logging will get you out of a tight spot, poor quality logging will have you pulling your hair out (metaphorically in my case 😊). Here, I try to share the benefit of my experience and thinking in this area.

## TL;DR

- See through the eyes of support
- Don't burn the evidence
- Context is everything
- Keep the noise down

# `ERROR`

![pexels-pixabay-280076.jpg](https://cdn.hashnode.com/res/hashnode/image/upload/v1629225488724/CEfW_X3E6.jpeg)

My first real foray into logging came when developing a Visual Basic WinForms application. In those days, an unhandled error in a form event, e.g. from clicking button, would result in the whole application unceremoniously crashing in a flaming heap. Not a great user experience, and no wreckage to sift through to prevent it happening again.

To counter this, I created a Visual Studio add-in that would add some standard error handing to each event and some standard logging too. The result was a much more robust application, and when the inevitable errors occurred, we could ask the user to send us the resulting log file. This became the key for us to understand and address issues and logging became an integral part of our application.

This experience was foundational in forming my thinking about `ERROR` level logging. What I believe you need to do, is see the log through their eyes of support, where all you have is the `ERROR` level output to guide you. Get this logging wrong and you are up a certain creek without a certain paddle.

So, what do I think you need to concentrate on?

- Log all aspects of the error
  - In C#, this is the message, the stack trace, and any inner exception details too.
- Log all contextual information that you have available
  - At the point of an error, you are in a unique position to log the state at the time it occurred. This opportunity shouldn't be squandered, and all salient information should be logged (but no credit card details folks!).
- Ensure that the resulting logging is meaningful
  - If at all possible, force an error to occur and view the resulting logging. Put yourself in the position of production support and ask yourself if this information would lead you to the cause and the solution. If not, then think how it could be improved.

Not strictly to do with logging, but related to it, is making sure that stack traces are preserved. All to often, I have seen this in C# code:

```C#
public void MyDodgyMethod() {
  try {
    DoSomethingDodgy();
  }
  catch (Exception ex) {
    LogError(ex.Message);
    throw ex; // DON'T DO THIS PLEEEEEEEEEASE!
  }
}
```

This has the effect of throwing away the stack trace and starting a new, misleading one. I would urge you to know your tools and know how to get the most out of them in error situations. In C#, it can be a good thing to throw a new exception with local contextual data but include the current exception as an inner one. However, care must be taken not to do more harm than good. In short, don't burn the evidence.

# `WARN`

![pexels-ash-modernafflatus-3662579.jpg](https://cdn.hashnode.com/res/hashnode/image/upload/v1629225251091/MFioG5fQ_x.jpeg)

I have an admission to make in that I haven't used the `WARN` level much at all in my time. I guess you could use them to indicate some non-functional degradation, or an error condition that was recoverable. However, much like compiler warnings, I suspect these just get ignored and end up becoming noise.

# `INFO`

![pexels-ben-mack-5326900.jpg](https://cdn.hashnode.com/res/hashnode/image/upload/v1629225278072/o0riYnjIj.jpeg)

My approach to `INFO` level logging is to use it to give a picture of execution path through an application. Points at which I would look to add `INFO` level logging would be at the boundary of services and at key decision points within those services.

I have worked on systems that have been made up of many separate services, some of which I have been responsible for. These services were subject to orchestration and, inevitably, failures. To cover my own behind, I was rigorous in adding `INFO` level logging to all the boundary points to those services I developed. I developed a set of standard tools to log the inbound call and the outbound response, along with `ERROR` level logging for exceptions.

The result of this approach made it straightforward for me to identify whether a failure had occurred within a particular service. Ideal for passing the buck 😉 Even when the failure was within the service, I knew I had meaningful information to work with. So, it wasn't all bad.

![boundary-logging.jpg](https://cdn.hashnode.com/res/hashnode/image/upload/v1629224228847/mlzpyrXy0.jpeg)

When I developed a process orchestration framework, I had the framework itself log out `INFO` level entries to automatically trace the flow. This freed up the users of the framework to concentrate on the functionality, knowing that the tracing aspect was already done. If possible, I would heartily encourage such as aspect-oriented approach as it brings great dividends in the consistency and quality of logging.

However, none of this tracing is much use without context. By context, I mean something to identify what the tracing statement was related to. It could be a correlation id, an id of a domain entity, a thread id, but without any the statement loses much of its meaning and usefulness.

As systems get more distributed, this gets more important. There are plenty of tools out there to help, e.g. AWS X-Ray, but I can't say I have used them yet. The key whatever you use, is to make your logs meaningful. Again, look at them through the eyes of support, and think how they could be improved.

`DEBUG`

![pexels-markus-spiske-1089438.jpg](https://cdn.hashnode.com/res/hashnode/image/upload/v1629225262769/DPwc9Ikoq.jpeg)

For me, `DEBUG` level logging is there to be switched on when you need to see the nitty-gritty of what is going on in an application. However, all too often, I have seen `DEBUG` level logging be the dumping ground for what I call "I'm here!" logging. For example:

`2009-03-18 19:56:28,901 DEBUG - Process lists generated.`

What generated the process lists? Is it noteworthy that the process lists have been generated? What does the process list contain? There is the other issue that if there are multiple calls executing simultaneously then how do I know which call this relates to?

`2009-03-18 17:06:35,566 DEBUG - ProcessEngine: d865e14b-971b-4b2d-b138-d6217afdd41d : Decision 1.0 - ExecuteRules_Decision : C8046691354, Overall rule results [OverallRuleStatus=Decline]`

This tells us the component that did the logging (`ProcessEngine`), an id that can be used to trace a single call (`d865e14b-` etc.), the module that was executing (`Decision 1.0 - ExecuteRules_Decision`), the core entity that was being processed (`C8046691354`) and the result of the module's processing (`Overrall rule results [OverallRuleStatus=Decline]`).

To paraphrase what I was told as a child, "If you haven't any useful to say, don't say anything". There should be a clear purpose to all log entries at all levels. Of course, there is a need for quick `DEBUG` entries as part of development. However, you should be rigorous enough to ensure that they are removed before committing the code. The more noise that the logs receive, the less useful they become.

One example where `DEBUG` level logging proved invaluable in my career, was in the development and support of a rules engine. The rules engine allowed users to define rules using a graphical, non-code way. The engine would then evaluate these rules using an interpreter. This meant you could not debug the rules in a standard way using an IDE.

As these rules could be complex, it was imperative to be able to understand what was going on 'under the hood'. The solution was to build logging into the evaluation engine, so each part of the rule could be logged. Each 'AND', 'Greater than', and so on. Where necessary, this verbose logging could be switched on and the results pored over to ascertain exactly how the output from the rule was reached.

# `ALL`

IMHO logging should be treated as an integral part of any system you are developing. Ad-hoc logging, or logging as an afterthought, will probably not be half as useful as a support-focussed, context-laden, consistent approach.

I should also mention structured logging here, as it is the way forward where it is available. Better people than me have written about it, so here is a guide to [What Is Structured Logging and Why Developers Need It](https://stackify.com/what-is-structured-logging-and-why-developers-need-it/). Log aggregation deserves a mention as well. Having all your logs together in one place makes all the difference. Coupled with structured logging, the results can be transformative.

Happy and fruitful logging!
