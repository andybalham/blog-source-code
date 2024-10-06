# Using composition over inheritance when creating a hybrid OpenAPI client

## Links

- [Wikipedia - Composition over inheritance](https://en.wikipedia.org/wiki/Composition_over_inheritance)

  - > Composition over inheritance (or composite reuse principle) in object-oriented programming (OOP) is the principle that classes should favor polymorphic behavior and code reuse by their composition (by containing instances of other classes that implement the desired functionality) over inheritance from a base or parent class.

  - > To favor composition over inheritance is a design principle that gives the design higher flexibility. It is more natural to build business-domain classes out of various components than trying to find commonality between them and creating a family tree. In other words, it is better to compose what an object can do (has-a) than extend what it is (is-a).

  - > One common drawback of using composition instead of inheritance is that methods being provided by individual components may have to be implemented in the derived type, even if they are only forwarding methods. In contrast, inheritance does not require all of the base class's methods to be re-implemented within the derived class.
    - C# provides default interface methods since version 8.0 which allows to define body to interface member.

- [Thoughtworks - Composition vs. Inheritance: How to Choose?](https://www.thoughtworks.com/insights/blog/composition-vs-inheritance-how-choose)

  - > Composition is fairly easy to understand - we can see composition in everyday life: a chair has legs, a wall is composed of bricks and mortar, and so on. While the definition of inheritance is simple, it can become a complicated, tangled thing when used unwisely. Inheritance is more of an abstraction that we can only talk about, not touch directly. Though it is possible to mimic inheritance using composition in many situations, it is often unwieldy to do so. The purpose of composition is obvious: make wholes out of parts. The purpose of inheritance is a bit more complex because inheritance serves two purposes, semantics and mechanics.

  - > Inheritance captures semantics (meaning) in a classification hierarchy (a taxonomy), arranging concepts from generalized to specialized, grouping related concepts in subtrees, and so on. Inheritance captures mechanics by encoding the representation of the data (fields) and behavior (methods) of a class and making it available for reuse and augmentation in subclasses. Mechanically, the subclass will inherit the implementation of the superclass and thus also its interface.

  - Perhaps the following guideline could be used. I.e., start with composition, but switch to inheritance if the need arises:

    - > If you find that you are using a component to provide the vast majority of your functionality, creating forwarding methods on your class to call the component’s methods, exposing the component’s fields, etc., consider whether inheritance - for some or all of the desired behavior - might be more appropriate.

- [Code Maze - Composition vs Inheritance in C#](https://code-maze.com/csharp-composition-vs-inheritance/)

  - > So, we should use inheritance if:
    >
    > - There is an “is-a” relationship between classes (X is a Y)
    > - The derived class can have all the functionality of the base class
    >
    > For all other instances, the composition is the preferred choice.
