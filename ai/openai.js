/* @lianix-meta
{
  "id": "openai",
  "name": "Openai",
  "description": "",
  "method": "POST",
  "endpoint": "/api/openai",
  "category": "ai",
  "inputs": [
    {
      "name": "query",
      "type": "text",
      "required": false,
      "description": "The query to send to the chatbot."
    },
    {
      "name": "message",
      "type": "number",
      "required": false
    }
  ],
  "outputs": [
    {
      "type": "json",
      "label": "Result"
    }
  ],
  "tags": [],
  "dependencies": [
    "axios",
    "cheerio",
    "form-data"
  ]
}
*/

// const axios = require('axios');
// const cheerio = require('cheerio')
// const FormData = require('form-data');
import axios from 'axios';
import * as cheerio from 'cheerio';
import FormData from 'form-data';

async function chatGpt(query) {
 try {
  // Mengambil nonce (dikosongkan sementara jika tidak diperlukan)
  let urlNon = 'https://gptaichat.org'
  let getNonce = await axios.get(urlNon)
  let html = getNonce.data
  let $ = await cheerio.load(html)
  let nonce = $('.wpaicg-chat-shortcode').attr('data-nonce')
  // console.log(nonce)

  // Membuat instance FormData
  const form = new FormData();
  let code = nonce
  form.append('_wpnonce', nonce);
  form.append('post_id', "10");
  form.append('url', "https://gptaichat.org");
  form.append('action', "wpaicg_chat_shortcode_message");
  form.append('message', query);
  form.append('bot_id', "0");
  form.append('chatbot_identity', "shortcode");
  form.append('wpaicg_chat_client_id', "j95PoxkGNk");
  form.append('wpaicg_chat_history', JSON.stringify(["Human: " + query]));

  let response = await axios('https://gptaichat.org/wp-admin/admin-ajax.php', {
         method: 'POST',
         data: form,
         headers: {
          ...form.getHeaders(),
          "Accept": "*/*",
          "Accept-Encoding": "gzip, deflate, br",
          "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
          "Content-Type": "multipart/form-data; boundary=----WebKitFormBoundarydT9KFtDidcJydSNq",
          "Cookie": "cf_clearance=OMDHKJydcE4LpwYAhlH6WDK8ynRYtLwKhUTGDgOmCe0-1719554315-1.0.1.1-vYJt8Vtoul3pfWCOjYcilHY8Ld3llXQW6ws4KApqbtuxWaNRbygUuWpW4o_HVeKR.u9S5hT03zV9xvv8gsQe.w",
          "Origin": "https://gptaichat.org",
          "Referer": "https://gptaichat.org/",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"
        }
    });

    let pesan = response.data.data
    // console.log(pesan)
    let result = {
        status: true,
        creator: 'nuyyOfc',
        data: {
            pesan: pesan
        }
    };
    console.log(result);
    return result;
 } catch(error) {
    return {
        status: false,
        error: 400,
        data: {
          pesan: 'error' // response.data.error
        }
    };
 }
}

export { chatGpt }
// chatGpt('apa yang kamu bisa lakukan untukku?')