# Programming with natural language

- Using SudoLang to program ChatGPT to generate comedy characters

40 years ago I saw someone try to program with natural language. Now that has become a reality with large language models (LLMs) and [SudoLang](https://github.com/paralleldrive/sudolang-llm-support). The big question is can we use it to program ChatGPT to be funny?

## 40 years ago

It was 1982 and I was attending the school computer club. We were taking turns to program the 1K [ZX81](http://www.zx81stuff.org.uk/zx81/jtyone.html). One member took their turn at the 'keyboard' and attempted to type something along the lines of...

```text
10 IF THE PLAYER PRESSES LEFT THEN MOVE THE SPACESHIP LEFT
```

The result was the following...

```text
10 INPUT F THE PLAYER PRESSES LEFT THEN MOVE THE SPACESHIP LEFT
```

Apart from the interesting fact that variables on the ZX81 could have spaces in them, the computer was clearly not going to do what was being asked. How foolish they were, my 13yo thought.

Fast-forward 40 years and this sort of programming is now possible, thanks to large language models and the insight of [Eric Elliot](TODO) and his work developing [SudoLang](TODO).

## Encountering SudoLang

I was listening to the excellent [.Net Rocks!](https://www.dotnetrocks.com/details/1865) podcast, when they mentioned SudoLang. When I mentioned to my co-workers that SudoLang was being developed by Eric Elliot, I was told in no uncertain terms what a very smart fellow he was. So, my interest sufficiently piqued, I got a ChatGPT Plus subscription, followed the steps in the [AI Programming for Absolute Beginners](https://medium.com/javascript-scene/ai-programming-for-absolute-beginners-16ac3fc6dea6) article, and my mind was blown.

To quote from the [SudoLang GitHub repo](https://github.com/paralleldrive/sudolang-llm-support):

> SudoLang is a programming language designed to collaborate with AI language models including ChatGPT, Bing Chat, Anthropic Claude, and Google Bard. It is designed to be easy to learn and use. It is also very expressive and powerful.
>
> All sufficiently advanced language models understand it without any special prompting. You do not need to paste the SudoLang specification before using SudoLang with your favorite AI.

## Programming with SudoLang

The question was what sort of program should I write. How about one that generates some comedy names in the spirit of Key and Peele and their [East vs West sketches](https://www.youtube.com/watch?v=gODZzSOelss).

SudoLang programs are written in Markdown and start with the role that provides the context. Think of it like briefing an actor. In our case, an actor that does the following.

```md
# East vs West Player Generator

Generate a plausible, but comedic sounding name for an American football player.
```

We then specify the state of the application. The LLM understands that the curly braces delimit the various components. We don't need to specify types were they can be inferred. Where they can't, we provide a hint in a comment.

```md
NameGenerator {  
 State {
Name
CollegeOrSchoolOrPrison
Team // East|West
Position
}
}
```

A key concept in SudoLang is programming by constraints, so now we add some to our program.

```md
NameGenerator {  
 State {
...
}
Constraints {
The name must consist of at least a first name and a surname.
The name must not be the name of a real player.
The name must sound amusing, but must be able to be pronounced.
}
}
```

Like the pupil 40 years ago, all we do is express our intention in natural language.

Finally, we can add a couple of commands and a function to greet the user.

```md
NameGenerator {  
 State {
...
}
Constraints {
...
}
/next Generate the next name
/help Provide help
}

welcome("Welcome to the name generator. Type /next to get the next name")
```

And now our program ready to run or, if you prefer, our actor is ready to perform.

Pasting it into ChatGPT GPT-4, we get the following response:

```text
Welcome to the name generator. Type /next to get the next name. If you need assistance or further information, type /help. Enjoy!
```

Note here that it has given us the greeting we programmed, but our actor has gone a little further and added that assistance is also available.

Let's try a name, so typing `/name` returns:

```text
I'm sorry, the provided command "/name" is not recognized. Please use one of the supported commands such as "/next" or "/help". Would you like to proceed with "/next" to generate a name?
```

Oops, I forgot my own commands. However, the program gave a helpful response without us having to explicitly program for that eventuality. Typing `/next` returns:

```text
I apologize for the confusion. Let me generate a name for you now.

NameGenerator:
  State:
    Name: "Dexter 'Dizzy Dukes' Duckworth"
    CollegeOrSchoolOrPrison: "University of Tennessee"
    Team: "East"
    Position: "Running Back"
```

Our actor is almost British here, apologising for other's mistakes. However, it has successfully done what we wanted and generated a mildly amusing name.
