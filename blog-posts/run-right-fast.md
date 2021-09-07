Here is my guide to the three steps to software development. Please take it with a pinch of salt and let it be some food for thought. 

## TL;DR

1. Understand the problem, explore the solution space (Make it run 🏃‍♂️)
1. Now you know the solution, express it as well as possible (Make it right ✔)
1. Now it is expressed well, how can it be optimised? (Make it fast 🚀)

Depending on the context, 2 and 3 may not be necessary.

## Make it run 🏃‍♂️

![pexels-run-ffwpu-2526878.jpg](https://cdn.hashnode.com/res/hashnode/image/upload/v1631038135390/kTFIG0t8y.jpeg)

This step is all about having some working code that meets the acceptance criteria. This, of course, assumes you have some acceptance criteria. If you don't, then I would suggest you find out what it is before starting. You will also need to know how to work out if your solution meets that criteria. This could be an ad-hoc manual test or, hopefully, something more structured and repeatable. Either way, before your start you should have a plan to know when you can stop.

The make it run step is all about gaining understanding of the problem in hand and exploring the solution space. I have found that writing tests or just thinking about a test approach often pays great dividends in gaining this understanding. I have never done formal Test Driven Design (TDD), but I have done enough tests before code to get a feel for how it can be a powerful technique.

The code at this step is somewhat equivalent to an Minimally Viable Product (MVP). Corners can be cut with regard to structures and abstractions. Exploration and understanding are the key here. I find that if I fall into the trap of creating class hierarchies, interfaces, and such items too early, then I run the danger of feeling tied to those artefacts and I can lose agility in reaching a solution. It can be hard to give up your code.

Once the code is meeting the acceptance criteria, then I consider moving on to the next step. However, depending on the context, this may not be necessary. Is the code for a one-off prototype or destined for a short-lived application? I am not advocating wilful technical debt here, just pointing out that just running may be good enough and it needs to be considered.

## Make it right ✔

![pexels-pixabay-159275.jpg](https://cdn.hashnode.com/res/hashnode/image/upload/v1631038057512/JyfahMR9Y.jpeg)

Making it right is all about taking the learning from making it run and, now that you know how to solve the problem, expressing the solution well and laying the foundation for the future. By keeping investment in the code up to this point light, it should hopefully make it easier to potentially start from scratch. Fred Brooks said, "Plan to throw one, you will, anyhow." I appreciate that this might not be a luxury that some folk have, but it you do then you may well be surprised at how much better you can make that second version.

The key here is to lay the foundation for the future of the software. To make it maintainable, understandable, and sustainable. This is where careful naming, well thought out abstractions, separation of concerns, and all that clean code jazz play their part. You can apply all that you have learnt about what makes quality software. This is where you can make your code delight the reader and make it pleasure to maintain. OK, that may be a step too far, but you can at least try 👍

By the time you have got it running and you have got it right, then you have probably got a lot further than most. Taking the next step may well not be necessary at all.

## Make it fast 🚀

![pexels-sourav-mishra-3136673.jpg](https://cdn.hashnode.com/res/hashnode/image/upload/v1631038198299/tPMl4_a76.jpeg)

The final step is to make it fast. Then main reason to keep it separate is to try to prevent premature optimisation, which a wiser person than me said was the root of all evil. However, I am not afraid to admit that have fallen into the trap myself and had to live with the consequences for many years.

I expect that there are many fine guides our there on how to profile and optimise your code. What I do know is that if code is well-structured, i.e. 'right', then optimising becomes much more straightforward. With concerns logically separated, there are often suitable seams in which to put caches and other typical optimisations. If your code isn't 'right', then optimising can just pour fuel on the fire of technical debt.

## Summary

So there you have it, there are only three steps and you might not need them all. As I like to say, "What could possibly go wrong?" 😜