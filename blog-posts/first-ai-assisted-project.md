# My First AI-assisted Project

## Overview

In this post, I share my experience of learning how to use ChatGPT to assist me develop a tool to assist me in solving a real world problem. A problem in a domain where I have limited knowledge.

Every February, under the guise of Andy Balham, I take part in [FAWM (February is Album Writing Month)](https://fawm.org/). This is an online challenge to write and record 14 songs in 28 days (14.5 in a leap year!). The problem I had was that the resulting MP3 files need to be hosted, but my usual option was is not available this year.

So I set myself the challenge of finding a hosting alternative and, to provide a bit more of a challenge, develop a simple HTML interface on which to view and play the resulting songs.

## What are my options?

I first started asking ChatGPT about hosting static websites in [AWS](https://aws.amazon.com/), as I have experience in that area. However, when I asked ChatGPT the following question I got an interesting suggestion:

> How can I create a simple static website that looks good?

The part that caught my eye was 'GitHub Pages' (emphasis mine):

> **Deploy Your Website:**
>
> Once you're satisfied with the look and feel:
>
> - Host it on platforms like **GitHub Pages**, Netlify, Vercel, or any web hosting provider.

I hadn't heard of this, so I prompted ChatGPT for more information:

> Can you tell me more about GitHub pages please?

ChatGPT duly responded:

> GitHub Pages is a free web hosting service offered by GitHub that allows you to easily publish static websites directly from your GitHub repositories. It's a convenient way to showcase your projects, blogs, documentation, or personal websites to the world. Here are some key points about GitHub Pages:
>
> 1. Free Hosting: GitHub Pages provides free hosting for static websites, which includes HTML, CSS, JavaScript, and other static files. This makes it a cost-effective solution for hosting personal or project websites.
>
> 1. GitHub Integration: GitHub Pages is tightly integrated with GitHub repositories. You can create a dedicated branch (usually named gh-pages or main for user/organization pages) or use the docs folder in your repository to store your website files. When you push changes to this branch or folder, your website is automatically updated.

This sounded ideal, as I already had a GitHub account and the price was right in my sweet spot (free 🙂).

The original chat can be found [here](https://chat.openai.com/share/9371adde-efa9-4e74-a8d2-7b0c9a033c2b).

## How can I test it?

Like all good software engineers, my first thought was how to test my static website as I developed it. So I lent on my assistant again:

> I want to develop a static website. Whilst I am doing development on my PC, how can I host the website so that I can see instant results when I save changes?

As a regular user of VS Code, the following suggestion jumped out:

> Integrated Development Environment (IDE) Servers:
>
> 1. Most modern Integrated Development Environments (IDEs) or code editors come with built-in tools to preview websites. For instance:
>
>    - Visual Studio Code: Has an extension called Live Server which provides a live preview of your site with hot-reload functionality.

A quick search for the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension in VS Code and I soon had a way to instantly view rendered HTML. Now I was all set to go into the unfamiliar territory of website development.

The original chat can be found [here](https://chat.openai.com/share/431c6e0f-74b7-42ad-a981-af10904d6c5b).

## But I'm not an HTML expert

Although I have been in the IT business for quite a while, my focus has pretty much always been on the back end. I have a rudimentary knowledge of HTML, but not much beyond that. What I needed what an expert to help me, so using [SudoLang](https://github.com/paralleldrive/sudolang-llm-support/blob/main/sudolang.sudo.md) I prompted ChatGPT with the following:

```markdown
# An expert in writing HTML

Role-play as a world-class HTML writer who is proficient in using the Bootstrap framework to produce attractive and responsive pages.

HTMLExpert {
/write - Take a description of a page and output HTML to match it
}
```

With the role set, I asked the following:

> /write a page that contains links to an album of MP3 files. The page should contain a placeholder for a description of the album. Along with links to download the MP3 files, there should be the name of each song and a link to a page containing the lyrics for that song.

The result was an HTML page ([source](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/files/first-ai-assisted-project/html-expert-01.htm)) that admirably met my specification:

![Rendered view of HTML page](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/first-ai-assisted-project/html-expert-01.png?raw=true)

ChatGPT also added the following, providing helpful assistance in how to use the result:

> To use this template:
>
> - Replace "Album Name" with the name of your album.
> - Replace the placeholder text under the ID albumDescription with your album's description.
> - For each song in your album:
>   - Duplicate the &lt;li&gt; element.
>   - Replace "Song 1" with the song name.
>   - Replace "path/to/song1.mp3" with the correct path or URL to the MP3 file.
>   - Replace "path/to/song1_lyrics.html" with the correct path or URL to the song's lyrics page.

This looked like a great start, so I wondered if it could be improved:

> That is great. What would be even better would be a music player so that each song could be played directly from the page.

To which I got the response:

> Of course! Let's integrate an HTML5 &lt;audio&gt; element with controls for each song so that users can play them directly from the page.
>
> Here's an enhanced version of your album page with the music player functionality:

And sure enough, the page ([source](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/files/first-ai-assisted-project/html-expert-02.htm)) now had a music player on it. I supplied an MP3 in the appropriate location, and sure enough I could play it from my browser.

![Rendered view of the HTML page with a music player](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/first-ai-assisted-project/html-expert-02.png?raw=true)

I then decided to see if the process would benefit from a more precise specification. So, as an experiment, I tried using [Markdown](TODO) as a specification format and prompted ChatGPT as follows:

> /write
>
> ```markdown
> # Album Name
>
> A link to an image for the album cover
>
> A list of songs on the album and for each song:
>
> - The title of the song
> - A link to download the MP3
> - A toggle button to show and hide the notes for the song, the text for the button changes on toggle
> - A toggle button to show and hide the lyrics for the song, the text for the button changes on toggle
> - An audio player to allow the MP3 to played from the page
>
> The songs are in a sub-folder call mp3s
> The images are in a sub-folder called images
>
> The footer should say that all material is copyrighted to Andy Balham
> ```

The result, once again, was pretty good ([source](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/files/first-ai-assisted-project/html-expert-03.htm)):

![Rendered page from markdown definition](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/first-ai-assisted-project/html-expert-03.png?raw=true)

However, testing the page I found that the toggling didn't quite work. Using my programming knowledge I prompted ChatGPT:

> The toggling doesn't work. I think targetElement.classList.contains('show') should be btn.textContent.includes('Hide')).

To which ChatGPT replied:

> You're right; the toggle behaviour I provided previously was based on Bootstrap's show class state on the target element, which might not reflect the exact moment when the toggle happens. Let's adjust the toggle behaviour by updating the script section.
>
> Here's the updated script:

And sure enough, an amended script was provided which fixed the issue ([source](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/files/first-ai-assisted-project/html-expert-04.htm)).

I then spent some time experimenting with refining the SudoLang program to style the page in different ways, before I decided that including the lyrics in the main page would be a bit onerous.

So I asked ChatGPT to regenerate the page with the lyrics details of the page definition updated as follows:

```markdown
For each song:

- A toggle button 'Lyrics' to show and hide the lyrics for the song

Folder information:

- The lyrics are in a sub-folder called lyrics, one file per song
```

The result was an amendment to the collapsible lyrics section:

```html
<!-- Lyrics Collapsible Section -->
<div class="collapse mt-3" id="lyricsSample">
  <div class="card card-body">
    <a href="lyrics/song-title-lyrics.txt">View Lyrics</a>
  </div>
</div>
```

A link wasn't what I wanted, so I asked for alternatives:

> Is there any way the text from the lyrics files could be included without using an &lt;a&gt; ref?

Sure enough ChatGPT responded with some options:

> To include the lyrics text directly on the page without using an &lt;a&gt; link, you have a couple of options, but each comes with its own considerations and limitations:
>
> 1. Embedding Lyrics Directly in HTML: &lt;snip&gt;
> 2. Using JavaScript to Load Lyrics: &lt;snip&gt;
> 3. Server-Side Inclusion: &lt;snip&gt;

The JavaScript option looked like what I wanted, so asked for that:

> Please update the HTML with the JavaScript version

As you can see from below, the result ([source](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/files/first-ai-assisted-project/html-expert-05.htm)) was a partial success. The lyrics were loaded on demand, but the rendering left a little to be desired:

![Rendered lyrics with no HTML breaks](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/first-ai-assisted-project/html-expert-05.png?raw=true)

So I asked ChatGPT to sort that out.

> If the lyrics are in plain text format, can you amend the JavaScript to insert suitable HTML markup to make the lyrics break across lines

The response was an amended JavaScript function, which I then copy and pasted into the page ([source](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/files/first-ai-assisted-project/html-expert-06.htm)) and the results are shown below:

![Rendered lyrics with HTML breaks](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/first-ai-assisted-project/html-expert-06.png?raw=true)

The result is not perfect, blank lines have not been preserved, but it will suffice for my needs. All-in-all, I was impressed with how I was able to go from nothing to a page that contains functionality that I wanted. It won't win any design awards, but it would have taken me significantly longer to develop with the AI assistance.

The whole chat can be found via this [link](https://chat.openai.com/share/38c54131-b94d-4aea-bc53-bb9896928583).

## How could I repeat it?

As a final step, I thought I would lean on ChatGPT once more and ask it to write a JavaScript program to merge the HTML template it had created with a YAML file in the following format:

```yaml
albumName: Aye-Aye?
songs:
  - title: Guinness Greed
    mp3Filename: 01_guinness_greed
    notes: "Prompt: /genre greed /subject Guinness /write must include reference to John"
  - title: Flood's Domain
    mp3Filename: 02_floods_domain
    notes: "Prompt: /genre fear /subject floods /write"
```

My prompt for this was simply the following:

> You are an expert in write Node.js programs. I would like you to write a program that receives a YAML file as input, merges the details of that file with the an HTML template, and then outputs an HTML file containing the merged result.
>
> Here is an example YAML file: &lt;snip&gt;
>
> Here is the HTML template: &lt;snip&gt;

The resulting output from the resulting [program](TODO) was almost perfect:

TODO: Rendered output HTML showing album name missing

The only thing that wasn't right was that the `H1` element hadn't been replaced with the album name. ChatGPT had used the `replace` method and that seemed to only replace the first match, so I asked the following:

> How can the program be changed to make replace('Album Name', yamlData.albumName) replace all instances of 'Album Name' and not just the first instance?

To which I got the following response and an updated `mergeYAMLWithTemplate` function:

> To replace all instances of a specific string in JavaScript, you can use a regular expression with the global (g) flag. This way, the replace method will replace all occurrences of the string in the text, not just the first one.

I pasted in the updated function, ran the program and was presented with the following expected result:

TODO: Rendered output HTML showing album name missing

The whole chat can be found via this [link](https://chat.openai.com/share/2c9f3403-2ebf-468a-a3b5-61d8d260a109) and the JavaScript program [here](TODO).

## Summary

TODO
