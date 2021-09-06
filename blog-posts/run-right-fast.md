# Make it run, make it right, make it fast

The three steps to software development (and you may not need them all)

Here is my guide to what I consider the three steps to software development. It is not meant to be taken 100% seriously, but perhaps can give some food for thought. To some extent, it can probably be applied to making small code changes and to developing whole products.

## TL;DR

1. Understand the problem, explore the solution space (Make it run)
1. Now you know the solution, express it as well as possible (Make it right)
1. Now it is expressed well, how can it be optimised? (Make it fast)

Depending on the context, 2 and 3 may not be necessary.

## Make it run

This step is all about having some working code that functionally meets the acceptance criteria. This, of course, assumes you have some acceptance criteria. If you don't, then I would suggest you find out what it is before starting. You will also need to know how to work out if your solution meets that criteria. This could be an ad-hoc manual test or, hopefully, something more structured. Either way, before your start you should have a plan to know when you can stop.

This step is all about understanding the problem to solve and exploring the corresponding solution space. I have found that writing tests or just thinking about a test approach often pays great dividends in the understanding. I have never done formal Test Driven Design (TDD), but I have seen enough to get a feel for how it can be a powerful technique.

The code at this step is somewhat equivalent to an Minimally Viable Product (MVP). Corners can be cut with regard to structures and abstractions. Exploration and understanding is the key for me here. If I fall into the trap of creating class hierarchies, interfaces, and such items too early, then I run the danger of feeling tied to them and I can lose agility in my code.

Once the code is meeting the acceptance criteria, then I consider moving on to the next step. However, depending on the context, this may not be necessary. Is the code for a one-off prototype or destined for a short-lived application? I am not advocating wilful technical debt here, just pointing out that just running may be good enough and needs to be considered.

## Make it right

Making it right is all about taking the learning from making it run and reshaping the solution to express the solution well and lay the foundation for the future. By keeping investment in the code up to this point light, it should hopefully make it easier to possibly start from scratch. To possibly paraphrase Fred Brooks, "Plan to throw one, you will, anyhow." I appreciate that this might not be a luxury that some folk have, but it you do then you may well be surprised at how much better you can make that second version.

The key here is to lay the foundation for the future of the software. This is where careful naming, well thought out abstractions, separation of concerns, and all that clean code jazz play their part. You can apply all that you have learnt about what makes quality software. This is where you can make your code delight the reader and make it pleasure to maintain. OK, that may be a step too far, but you can at least try :)

By the time you have got it running and got it right, you have probably got a lot further than most. Taking the next step might be a luxury that you don't need.

> This step could be applied to product development, but it might not be the best approach. I heard a tale of two companies with forks of the same code. One spent time polishing and honing theirs, and the other bolted feature after feature. One company sold a lot more licenses, guess which one.

## Make it fast

The final step is to make it fast. Then main reason to keep it separate is to try to prevent premature optimisation, which a wiser person than me said was the root of all evil. I am not afraid to admit that have fallen into the trap myself. 

I expect that there are many fine guides our there on how to profile and optimise your code. What I do know is that if code is well-structured, i.e. 'right', then optimising becomes more straightforward. With concerns logically separated, there are often suitable seams in which to put caches and other typical optimisations.

## Summary

So there you have it, there are only three steps and you might not need them all. As I like to say, "What could possibly go wrong?" ;)