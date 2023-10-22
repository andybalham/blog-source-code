# My first steps with the future of programming

## Using SudoLang and ChatGPT for humorous purposes

40 years ago I saw someone try to program with natural language. Now that has become a reality with large language models (LLMs) and [SudoLang](https://github.com/paralleldrive/sudolang-llm-support). My first question was, can we use these tools to generate comedy gold?

## 40 years ago

It was 1982 and I was attending the school computer club. We were taking turns to program the 1K [ZX81](http://www.zx81stuff.org.uk/zx81/jtyone.html). One member took their turn at the 'keyboard' and attempted to type something along the lines of...

```text
10 IF THE PLAYER PRESSES LEFT THEN MOVE THE SPACESHIP LEFT
```

The result was the following...

```text
10 INPUT F THE PLAYER PRESSES LEFT THEN MOVE THE SPACESHIP LEFT
```

Apart from the interesting fact that variables on the ZX81 could have spaces in them, the computer was clearly not going to do what was being asked. How foolish they were, my 13yo self thought smugly to himself.

Fast-forward 40 years and this sort of programming is now possible, thanks to LLMs such as ChatGPT and the insight of [Eric Elliot](https://medium.com/@_ericelliott) and his work developing [SudoLang](https://github.com/paralleldrive/sudolang-llm-support/blob/main/sudolang.sudo.md).

## Encountering SudoLang

I was listening to the excellent [.Net Rocks!](https://www.dotnetrocks.com/details/1865) podcast, when they mentioned SudoLang. When I mentioned to my co-workers that SudoLang was being developed by Eric Elliot, I was told in no uncertain terms what a very smart fellow he was. So, with my interest sufficiently piqued, I got a ChatGPT Plus subscription, followed the steps in the [AI Programming for Absolute Beginners](https://medium.com/javascript-scene/ai-programming-for-absolute-beginners-16ac3fc6dea6) article, and my mind was blown.

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

We then specify the state of the application. The LLM understands that the curly braces delimit the various components, giving them scope. In SudoLang you lean heavily on what the LLM can infer, so We don't need to specify types were they can be inferred. Where they can't, we provide a hint in a comment such as `East|West`.

```text
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

```text
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

Like the pupil 40 years ago, all we do is express our intention in natural language. In SudoLang, natural language is preferable, as that is what LLMs understand.

Finally, we add a couple of commands and a function to greet the user. Again, we use a convention for commands that the LLM will be familiar with (i.e. `/command`).

```text
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

> Welcome to the name generator. Type /next to get the next name. If you need assistance or further information, type /help. Enjoy!

Note here that it has given us the greeting we programmed, but our actor has gone a little further and added that assistance is also available.

Let's try a name, so typing `/name` returns:

> I'm sorry, the provided command "/name" is not recognized. Please use one of the supported commands such as "/next" or "/help". Would you like to proceed with "/next" to generate a name?

Oops, I forgot my own commands. However, the program gave a helpful response without us having to explicitly program for that eventuality. Typing `/next` returns:

```text
I apologize for the confusion. Let me generate a name for you now.

NameGenerator:
  State:
    Name: "Dexter 'Dizzy Dukes' Duckworth"
    CollegeOrSchoolOrPrison: "Puddle Jumpers Academy for Overachievers"
    Team: "East"
    Position: "Running Back"
```

Our actor is almost British here, apologising for other's mistakes. However, it has successfully done what we wanted and generated a mildly amusing name, plus a manufactured college of sorts. Not exactly comedy gold, but not too bad.

## Refining the program

To refine our generator, let's add another line to the context to try to get names more like Key and Peele.

```text
# East vs West Player Generator
...
The name can have a middle name or initial and can have a suffix, such as III.
```

We'll also add a `height` and `weight` to the state. We will leave it to the LLM to work out suitable units.

```text
State {
  ...
  Weight
  Height
}
```

The colleges in the Key and Peele sketch are real ones, so let's add a constraint to ensure that ours are too. While we are at it, we add a constraint to make sure our offensive linemen are suitably hefty.

```text
Constraints {
  ...
  The college, school, or prison must be real.
  The weight and height must be consistent with their position in the team
}
```

Finally, we add a `/refine` command and amend the `/next` to output [YAML](https://en.wikipedia.org/wiki/YAML).

```text
/next Generate the next name and output the result in YAML
...
/refine Generate another name based on the last, but with more exaggeration
```

OK. When we paste in the program we get:

> Welcome to the name generator. Type /next to get the next name. For assistance or further options, type /help. Let's create some memorable players!

Once more, our actor has taken some liberties with the script, but the gist is spot on. Let's try out the `/next` command.

```yaml
NameGenerator:
  State:
    Name: "Thaddeus T. 'Thunder Thighs' Thompson III"
    CollegeOrSchoolOrPrison: "University of Alabama"
    Team: "West"
    Position: "Defensive Lineman"
    Weight: "310 lbs"
    Height: "6'4''"
```

Success. We have our output in YAML, the college is real, and the height and weight are position-appropriate. Let's try `/refine`.

```yaml
NameGenerator:
  State:
    Name: "Thaddeus T. 'Titanium Tackle' Thompson IV"
    CollegeOrSchoolOrPrison: "University of Alabama"
    Team: "West"
    Position: "Defensive Lineman"
    Weight: "325 lbs"
    Height: "6'5''"
```

OK. Not the greatest exaggeration perhaps, but the program did do what we asked.

Let's try one final revision of our program. First let's give each player a catchphrase.

```text
# East vs West Player Generator
...
Each player has a catchphrase based on their background, position,
  and physical stature.

NameGenerator {
  State {
    ...
    Catchphrase
  }
  Constraints {
    ...
    The weight and height must be consistent with their position in the team,
      but can be exaggerated for comic purposes.
    The catchphrase must not be based on any stereotypes.
  }
  ...
  /opposite Generate another name based on the last,
    but with opposite characteristics
}

overTheTopWelcomeInTheStyleOfAFootballCoach()
```

We have also loosened the height and weight constraint to try to get more extreme values and added a new command to generate an opposite character. The welcome was good before, but it could be more in keeping with the subject matter. So let's see if the amended version can gee us up a bit.

> Alright, team! Gather 'round! 🏈 This ain't just any old name generator! We're here to scout out the funniest, quirkiest, and downright unforgettable players! You want comedy? We got it! You want star power? We got it! Strap on those helmets, get in formation, and type "/next" to discover the next legendary player! Remember, we play hard, we play fair, but most importantly, we play for laughs! LET'S GO TEAM! 📣🎉

Yes, that certainly had an effect. Let's do what coach says and type `/next`.

```yaml
NameGenerator:
  State:
    Name: "Fitzgerald F. 'Flashy Footwork' Fiddlesticks"
    CollegeOrSchoolOrPrison: "Harvard University"
    Team: "East"
    Position: "Wide Receiver"
    Weight: "185 lbs"
    Height: "6'2''"
    Catchphrase: "You can't catch what you can't see!"
```

Not bad, let's try the `/opposite`.

```yaml
NameGenerator:
  State:
    Name: "Barnaby B. 'Boulder Boot' Bumblebee"
    CollegeOrSchoolOrPrison: "Stanford University"
    Team: "West"
    Position: "Defensive Tackle"
    Weight: "320 lbs"
    Height: "5'10''"
    Catchphrase: "I'm the mountain you can't move!"
```

Now let's go off-piste and just ask `Please generate a punter from a prison`.

```yaml
NameGenerator:
  State:
    Name: "Percival P. 'Penitentiary Punt' Peterson"
    CollegeOrSchoolOrPrison: "San Quentin State Prison"
    Team: "West"
    Position: "Punter"
    Weight: "195 lbs"
    Height: "6'0''"
    Catchphrase: "From the yard to the 50-yard line!"
```

This highlights that our programs can do more than we explicitly specify. So let's push that a bit further.

## Using the LLM to improve our program

Now that the LLM knows is very familiar with the context we are dealing with, let's see if it can suggest ways we can improve the program. Typing `Please suggest some possible commands to help refine the comedy potential of the characters` gets us the following.

> Certainly! Here are some potential commands to help refine the comedy potential:
>
> 1. `/exaggerate`: Amp up the comedy by making a character's feature or trait more extreme.
> 2. `/mashup`: Combine elements of two or more previously generated characters.
> 3. `/nickname`: Generate a unique and funny nickname based on the character's existing traits.
> 4. `/backstory`: Provide a short, humorous backstory for the character that ties into their attributes or catchphrase.
> 5. `/random_trait`: Add a random and unexpected trait or hobby that contrasts with the character's football position or personality for comedic effect.
> 6. `/swap`: Swap one trait or attribute for its comedic opposite.
> 7. ...and another six
>
> These commands would help add layers of comedy and depth to each character, making them more memorable and entertaining.

Not bad suggestions, let's add them to our program and try out `/backstory` for 'Bubba "Biscuit" McGillicuddy IV'.

> Bubba "Biscuit" McGillicuddy IV hails from the small town of Butterville, a place famous for its annual Butter Festival. Born into the McGillicuddy family, owners of the renowned "McGillicuddy's Marvelous Muffins & More" bakery, Bubba was always the center of attention.
>
> Growing up, while other kids played with toys, young Bubba played with dough. In fact, his nickname "Biscuit" was coined when, at the age of seven, he mistakenly wore a biscuit mold as a helmet and ran head-first into a wall, leaving a biscuit-shaped indentation. The name stuck, and so did his love for the sport.
>
> ...and so on.

This got some genuine laughs when I read it out, so I consider our quest for humour successful.

## Summary

SudoLang has changed the way I look at interacting with LLMs such as ChatGPT. The genius of SudoLang is that it takes advantage of the conventions that the LLMs have learnt, such a `/commands`, interfaces, and `{ scoping }`. I now approach each interaction with ChatGPT as if I am approaching an expert who I need to brief on what I want, what I don't want, and how I want it. SudoLang gives me a way to express this in a structured way. Once the expert has some experience of what I am after, I can even ask the expert how I can improve on what I am asking for.

I feel the same excitement of possibilities as I did when I got my own ZX81 40 years ago. But now, of course, I can use natural language.

## Links

- [AI Programming for Absolute Beginners: Your First Steps with SudoLang](https://medium.com/javascript-scene/ai-programming-for-absolute-beginners-16ac3fc6dea6)
- [SudoLang on GitHub](https://github.com/paralleldrive/sudolang-llm-support/blob/main/sudolang.sudo.md)
- [SudoLang: A Powerful Pseudocode Programming Language for LLMs](https://medium.com/javascript-scene/sudolang-a-powerful-pseudocode-programming-language-for-llms-d64d42aa719b)
- [Anatomy of a SudoLang Program: Prompt Engineering by Example](https://medium.com/javascript-scene/anatomy-of-a-sudolang-program-prompt-engineering-by-example-f7a7b65263bc)
- [Learn SudoLang on ChatGPT](https://chat.openai.com/share/1488c408-8430-454f-84b8-fdd1d8f815a2)
- [The Art of Effortless Programming: Why Every Developer Should Learn ChatGPT and SudoLang](https://medium.com/javascript-scene/the-art-of-effortless-programming-3e1860abe1d3)
- [AI Driven Development with SudoLang - Autodux (YouTube video)](https://www.youtube.com/watch?v=2jqPJsPuf9E)
