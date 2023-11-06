# Errors Should Be Errors

- Be wary when using step functions errors for flow control

## TL;DR

- Be wary when using step functions errors for flow control in step functions
- After throwing and catching an error, only the inputs and the basic error details are available

## Setting the scene

Our inherited codebase contained a step function that performed validation on a request, before proceeding to processing the request if the validation was successful. When the validation failed, either due to schema errors or authorisation, an error was thrown and caught by the step function. Depending on the error, a status table was updated and an event raised.

A simplified version is shown below:

TODO: Step function diagram

## Improving things for our users

Users don't always get things right, so it was common for requests to fail. In particular, they would fail for validation reasons. We were using [JSON Schema](TODO) and the [ajv](TODO) validation library, and we would log out the validation errors for the failed requests. However, to provide better feedback for our users, we decided to add the validation errors to the status table. The users could then query this table to understand why their request had failed without bothering us.

The only problem was, at the point the status table was being updated, we had no way of accessing the validation failures.

## The context of step function errors

After an error has been handled by a step function, only the following is available:

- The inputs to the step function
- The error type

TODO: Show this to be true

This makes sense, as there can be no guarantee of the state once an error occurs. The inputs never change, so it is safe to access their values, but nothing else apart from the type of error.

This means that it isn't possible to pass structured information into the error handlers, which is exactly what we wanted to do.

## Are these really errors?

It is somewhat a matter of opinion, but I would argue that neither validation failure is a true error. I say this, as we would expect both scenarios to occur in normal operations. The use of throwing and catching errors in this case looks like it was used as a convenience. The step function could have been written with an additional condition(TODO?) step, as shown below:

TODO: Step function diagram

With this approach, we can amend the validation step to pass additional data in the state. This can then be used downstream to update the status table.

## General discussion TODO

In my time, I have seen some egregious abuse of errors. I have seen [C#](TODO) code whose flow was built on throwing and catching custom exceptions of various types. Needless to say, debugging these 'exceptions as GOTOs' was not fun as the processing jumped from error handler to error handler.g

It is true that you can be faced with the choice of what to do when a 'getter' function fails to find the requested entity. Consider the following C# method:

```c#
MyEntity FindMyEntity(string id);
```

What should the method return if there is no such instance with a matching id? Should it return `null` or throw an exception?

I would say it depends on the caller. If the caller cannot continue without the entity, throw an exception. If it can continue, return `null`. This could be catered for with the following:

```c#
MyEntity FindMyEntity(string id, bool throwException = false);
```

Now the caller can control the behaviour as it needs.

## Summary

I would advise against using errors as a replacement for step function flow control using condition(TODO?) steps. Once the error is thrown, the current state is lost and only the error type is then available downstream.

In general, I would advise against throwing errors/exceptions/&lt;insert your favourite language version here&gt; as part of 'normal' processing unless the idioms of your preferred language recommend it.
