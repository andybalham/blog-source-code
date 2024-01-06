# My First AI-assisted Project

## Overview

Outline the task

## What are my options?

<https://chat.openai.com/share/9371adde-efa9-4e74-a8d2-7b0c9a033c2b>

## How can I test it?

<https://chat.openai.com/share/431c6e0f-74b7-42ad-a981-af10904d6c5b>

## But I'm not an HTML expert

Although I have been in the IT business for quite a while, my focus has pretty much always been on the back end. I have a rudimentary knowledge of HTML, but not much beyond that. What I needed what an expert to help me, so using [SudoLang](TODO) I prompted ChatGPT with the following:

```markdown
# An expert in writing HTML

Role-play as a world-class HTML writer who is proficient in using the Bootstrap framework to produce attractive and responsive pages.

HTMLExpert {
/write - Take a description of a page and output HTML to match it
}
```

With the role set, I asked the following:

> /write a page that contains links to an album of MP3 files. The page should contain a placeholder for a description of the album. Along with links to download the MP3 files, there should be the name of each song and a link to a page containing the lyrics for that song.

The result was an HTML page ([source](TODO)) that admirably met my specification:

TODO: Rendered view of HTML page

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

And sure enough, the page ([source](TODO)) now had a music player on it. I supplied an MP3 in the appropriate location, and sure enough I could play it from my browser.

TODO: Rendered view of the HTML page with a music player

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

The result, once again, was pretty good ([source](TODO)):

TODO: Rendered page from markdown definition

However, testing the page I found that the toggling didn't quite work. Using my programming knowledge I prompted ChatGPT:

> The toggling doesn't work. I think targetElement.classList.contains('show') should be btn.textContent.includes('Hide')).

To which ChatGPT replied:

> You're right; the toggle behavior I provided previously was based on Bootstrap's show class state on the target element, which might not reflect the exact moment when the toggle happens. Let's adjust the toggle behavior by updating the script section.
>
> Here's the updated script:

And sure enough, an amended script was provided which fixed the issue ([source](TODO)).

I then spent some time experimenting with refining the Sudolang program to style the page in different ways, before I decided that including the lyrics in the main page would be a bit onerous.

So I asked ChatGPT to regenerate the page with the lyrics details of the page definition updated as follows:

```markdown
For each song:

- A toggle button 'Lyrics' to show and hide the lyrics for the song

Folder information:

- The lyrics are in a sub-folder called lyrics, one file per song
```

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

As you can see from below, this was a partial success. The lyrics were loaded on demand, but the rendering left a little to be desired:

TODO: Rendered lyrics with no HTML breaks

So I asked ChatGPT to sort that out.

> If the lyrics are in plain text format, can you amend the JavaScript to insert suitable HTML markup to make the lyrics break across lines

The response was an amended JavaScript function, which I then copy and pasted into the page and the results are shown below:

TODO: Rendered lyrics with HTML breaks

The result is not perfect, blank lines have not been preserved, but it will suffice for my needs. All-in-all, I was impressed with how I was able to go from nothing to a page that contains functionality that I wanted. It won't win any design awards, but it would have taken me significantly longer to develop with the AI assistance.

The whole chat can be found via this [link](https://chat.openai.com/share/38c54131-b94d-4aea-bc53-bb9896928583).

## How could I repeat it?

<https://chat.openai.com/share/f1a9b7fe-2c83-478c-9fb5-19df25e1e6b2>

## The result

<https://andybalham.github.io/website-test/>

## Summary

TODO
