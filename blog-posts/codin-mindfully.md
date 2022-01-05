# Mindful Coding 

[Mindful eating](https://www.bbcgoodfood.com/howto/guide/how-eat-mindfully) is an approach that is all about paying attention to the way we eat. Research has shown eating mindfully helps us enjoy our food much more. This caused me to wonder whether we could take a similar approach to coding, mindful coding if you will.

> Practising mindful eating simply means being present when we eat - paying attention to it and being aware of it.

It struck me that when coding, at times it is possible to operate automatically and almost without thinking. That is, with a lack of awareness. Greedily producing code if you will. Perhaps by being a little more present, there are some aspects that we might benefit from being more aware of.

## Be aware of inefficiency and repetition

Coding can still involve plenty of inefficiency and repetition. Whether it is clicking the same menu options or writing the same boilerplate code over and over again. Being aware of these and taking action can help save time in the long run and make the process more enjoyable.

I recently had to learn a new IDE, one with no common keyboard shortcuts with previous IDEs I had used. I started by clicking the icons to run, debug, and so on, but I was aware that this was not the most efficient way to do it. I made myself seek out the keyboard shortcuts, and then forced myself to use them. Initially, this was slower than using the mouse. However, it quickly became second nature and made using the IDE much more pleasant. 

Most IDEs will have some kind of code snippet support. That is, a way of defining templates for common coding patterns into which you insert placeholders. Be aware of your own patterns and take advantage of the snippet functionality to cater for these. I typically like to create a custom `TODO` template containing the date and my initials. I have to admit that I am guilty of not creating snippets as early as I should. I need to be aware that when I think "I will create a snippet next time", then I should create the snippet right there and then. I know that once I have the snippets, they are a delight to use.

## Be aware of learning opportunities

As you navigate any code base, there will be opportunities to learn. It is often a lower-level detail, such as a newly-introduced keyword you haven't seen before, but it could also be a higher-level pattern too. I have found that it is worthwhile to be aware of these moments and take the time to explore what is being done and why. It is easy to get stuck in your own coding patterns and these moments can provide you with new and better ways of doing things. I am not advocating that you take a huge diversion when you have a deadline to meet, but it can be worth spending a little time, even if it is just noting down something to follow-up later.

## Be aware of your habits

This is one that can be quite hard, as it requires a degree of self-awareness and sometimes requires outside input. For example, I have come the realise that one of my habits is to start to create abstractions earlier than is necessary. I only really became aware of this when listening to a podcast in which one of the participants admitted to the same habit. Now that I am aware of it, I find it much easier to pull myself up when I start to build abstractions too early in the process.

Another habit that I required outside input to become aware of was 'expanding pull request syndrome'. When doing one piece of work, I would notice other work that would be a benefit and I would include that work in the pull request. This made the pull request harder to review and riskier to merge. Thankfully, the team I was working in gave great feedback and brought my attention to it. Now, my awareness is heightened and, when I start to notice be tempted by extraneous improvements, I am able to stop myself and raise a separate piece of work if necessary.

## Be aware of impact

This is focussed on avoiding your code, if not quite dying by a thousand cuts, getting muddied by a thousand commits. For example, as code is added to a method or a class, at some point that method or class should probably be refactored into smaller, more focussed components. Since the start of computing, divide and conquer has helped manage complexity. 

Given this, I try to be aware of the impact of my changes:

* On length - The temptation to just add another few lines of code to a method, or just another method to a class must have occurred to us all. It might feel less risky, it might even be less risky, but you might also be adding to a problem. Being aware of this can help you make the right call and help position the code for future maintainability and expandability.

* On complexity - Anther common temptation is to add a new flag to an existing method. This seems innocuous enough with the first flag, but then another comes along. Inside the method, the `if` statements start springing up and the tests get more convoluted. By being aware of the potential impact of your changes on complexity, you can help shape the code in ways to minimise that complexity. For example, the need for the flag may be the indicator that there is a higher-level concept that could be passed into the method in question. 

* On coupling - Coupling can drag a piece of software down, making testing almost impossible and changes riskier and riskier. Of all the things to be aware of, coupling is the most important for me. It is a big decision to bring in a dependency on another component, even if it is internal to the package it is in. If it is in another package, then it is an even bigger decision. If it is an external package, doubly so. I try ask myself if the new dependency is absolutely necessary and, if so, how the coupling can be mitigated. For example, can the dependency be put behind an internal interface?

## Summary

In our hectic coding lives, it is all too easy to almost 'code on automatic'. By being a little more present and aware, perhaps we can help ourselves be more productive, more knowledgeable, and enjoy coding even more.