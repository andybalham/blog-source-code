const fs = require("fs");
const yaml = require("js-yaml");

// Function to read YAML file
function readYAMLFile(filePath) {
  try {
    const fileContents = fs.readFileSync(filePath, "utf8");
    return yaml.load(fileContents);
  } catch (e) {
    console.error(e);
  }
}

// Function to create the HTML for a single song
function createSongHTML(song, index) {
  return `
    <div class="song-item mt-4">
        <h3>${song.title}</h3>

        <audio controls>
            <source src="mp3s/${song.mp3Filename}.mp3" type="audio/mpeg">
            Your browser does not support the audio element.
        </audio>

        <div class="mt-2">
            <a href="mp3s/${song.mp3Filename}.mp3" class="btn btn-primary btn-sm" download>Download MP3</a>
            <button class="btn btn-info btn-sm toggle-btn" type="button" data-bs-toggle="collapse"
                data-bs-target="#notes${index}">Notes</button>
            <button class="btn btn-secondary btn-sm toggle-btn" type="button" data-bs-toggle="collapse"
                data-bs-target="#lyrics${index}" onclick="loadLyrics('${song.mp3Filename}')">Lyrics</button>
        </div>

        <div class="collapse mt-3" id="notes${index}">
            <div class="card card-body">
                ${song.notes}
            </div>
        </div>

        <div class="collapse mt-3" id="lyrics${index}">
            <div class="card card-body" id="${song.mp3Filename}-lyrics">
                <!-- Lyrics will be loaded here -->
            </div>
        </div>
    </div>
  `;
}

// Function to merge YAML data into the HTML template
function mergeYAMLWithTemplate(yamlData, templatePath, outputPath) {
  fs.readFile(templatePath, "utf8", (err, htmlTemplate) => {
    if (err) {
      console.error(err);
      return;
    }

    let songsHTML = "";
    yamlData.songs.forEach((song, index) => {
      songsHTML += createSongHTML(song, index);
    });

    // Replace all instances of 'Album Name' with the actual album name
    const albumNameRegex = new RegExp("Album Name", "g");
    const finalHTML = htmlTemplate
      .replace(albumNameRegex, yamlData.albumName)
      .replace("<!-- Sample song entry -->", songsHTML);

    fs.writeFile(outputPath, finalHTML, (err) => {
      if (err) {
        console.error(err);
      } else {
        console.log("HTML file successfully created");
      }
    });
  });
}

// Main execution
const yamlData = readYAMLFile("path/to/yaml/file.yml");
mergeYAMLWithTemplate(yamlData, "path/to/template.html", "path/to/output.html");
