const getTextAnswers = async (question = "", options = [], ind = 0) => {
  try {
    let prompt = `Please provide an answer for the following question, and in the end add the answer in the format : 'Option : _ ':\n${question}\n\n`;
    if (options.length > 0) {
      prompt += `Options are:\n`;
      options.forEach((opt, i) => {
        prompt += `${i + 1}. ${opt}\n`;
      });
    }

    const requestBody = {
      prompt: prompt,
    };

    const response = await fetch("https://ai-forms-backend.vercel.app/api/text", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (response.ok) {
      console.log("ans " + data.ans);
      return data.ans; // Return the AI's response
    } else {
      console.error({ msg: "Error in API", error: data });
      return null;
    }
  } catch (error) {
    console.error({ msg: "Error in API", error });
    return null;
  }
};

const convertMarkdownToHtml = (markdown) => {
  // Convert headings (e.g., ## Heading)
  let html = markdown.replace(
    /^(#{1,6})\s*(.*?)(\n|$)/gm,
    (match, hashes, title) => {
      const level = hashes.length;
      return `<h${level}>${title.trim()}</h${level}>`;
    }
  );

  // Convert bold (**bold** or __bold__)
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__(.*?)__/g, "<strong>$1</strong>");

  // Convert italic (*italic* or _italic_)
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
  html = html.replace(/_(.*?)_/g, "<em>$1</em>");

  // Convert inline code (`code`)
  html = html.replace(/`(.*?)`/g, "<code>$1</code>");

  // Convert block math expressions (\[...\])
  html = html.replace(
    /\\\[(.*?)\\\]/gs,
    '<div class="math-block">\\[$1\\]</div>'
  );

  // Convert inline math expressions (\(...\)) including more complex ones
  html = html.replace(
    /\\\((.*?)\\\)/g,
    '<span class="math-inline">\\($1\\)</span>'
  );

  // Convert unordered lists (* item)
  html = html.replace(/^\s*\*\s+(.*)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>\s*)+/g, "<ul>$&</ul>");

  // Convert ordered lists (1. item)
  html = html.replace(/^\s*\d+\.\s+(.*)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>\s*)+/g, "<ol>$&</ol>");

  // Replace newlines with <br> (if not already handled by lists or blocks)
  html = html.replace(/(?<!<\/(li|h[1-6]|div|ul|ol|span)>)\n/g, "<br>");

  return html;
};

const getImageAns = async (url, question = "", options = []) => {
  try {
    let prompt = `Please provide an answer for the following question, and in the end add the answer in the format : 'Option : _ ':\n${question}\n if no question, it must be in the image, use that question to find the answer\n`;
    if (options.length > 0) {
      prompt += `Options are:\n`;
      options.forEach((opt, i) => {
        prompt += `${i + 1}. ${opt}\n`;
      });
    }
    const requestBody = {
      text : prompt,
      url: url,
    };
    const response = await fetch("https://ai-forms-backend.vercel.app/api/image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
    const data = await response.json();
    if (response.ok) {
      console.log("res:" + data);
      return data.ans;
    } else {
      console.error({ msg: "Error in API", error: data });
      return null;
    }
  } catch (error) {
    console.error({ msg: "Error in API", error });
    return null;
  }
};

const getAnswers = async () => {
  const questionElements = Array.from(
    document.querySelectorAll("div.Qr7Oae")
  ).map((el) => el.querySelector("div"));

  const solution = [];
  let promises = [];

  for (let i = 0; i < questionElements.length; i++) {
    promises.push(
      new Promise(async (resolve, reject) => {
        try {
          const question = questionElements[i];
          const questionData = JSON.parse(
            "[" + question.getAttribute("data-params").substring(4)
          );
          const questionObject = questionData[0];

          let answer = "";

          // Check if the question has an image and handle it
          const image = question.querySelector("img");
          if (image) {
            const url = image.src;
            const questionText = questionObject[1];
            const questionOptions = Array.from(questionObject[4][0][1]).map(
              (el) => el[0]
            )
            console.log("calling image api");
            answer = await getImageAns(url, questionText, questionOptions);
            console.log("ansss:" + answer);
            solution.push({ ind: i, questionText: "Image", answer });

            // Append the answer to the DOM
            let node = document.createElement("span");
            node.classList.add("answer_quiz_gpt");
            node.innerHTML = convertMarkdownToHtml(answer);
            question.parentElement.insertBefore(node, question);
          } else {
            // Handle text-based question
            const questionText = questionObject[1];
            const questionOptions = Array.from(questionObject[4][0][1]).map(
              (el) => el[0]
            );

            if (questionText && questionOptions.length > 0) {
              answer = await getTextAnswers(
                questionText,
                questionOptions,
                i + 1
              );
              solution.push({ ind: i, questionText, answer });

              // Append the answer to the DOM
              let node = document.createElement("span");
              node.classList.add("answer_quiz_gpt");
              node.innerHTML = convertMarkdownToHtml(answer);
              question.parentElement.insertBefore(node, question);
            } else {
              console.warn(`Question ${i + 1} data is missing or invalid`);
            }
          }

          resolve();
        } catch (error) {
          console.error({
            msg: `Error in execution for question ${i + 1}`,
            error,
          });
          reject();
        }
      })
    );
  }

  // Wait for all promises to resolve
  await Promise.all(promises);

  // Sort solutions by their index
  solution.sort((a, b) => a.ind - b.ind);
};

const toggleAnswers = () => {
  let answers = document.getElementsByClassName("answer_quiz_gpt");
  Array.from(answers).forEach((el) => {
    if (el.style.display === "none") {
      el.style.display = "block";
    } else {
      el.style.display = "none";
    }
  });
};

const deleteAnswers = () => {
  let answers = document.getElementsByClassName("answer_quiz_gpt");
  Array.from(answers).forEach((el) => el.parentElement.removeChild(el));
};
