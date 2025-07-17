// api/generate-questions.js

export default async function handler(request, response) {
  // POSTリクエスト以外は拒否
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  // Vercelの環境変数から、安全にAPIキーを取得
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return response.status(500).json({ error: 'APIキーが設定されていません。' });
  }

  try {
    // ブラウザから送られてきた設定を取得
    const { unit, textbook, count } = request.body;

    // Gemini APIへのプロンプトを作成
    const prompt = `
        あなたは日本の中学3年生向けの英語文法問題を作成する専門家です。
        以下の条件に従って、高品質な問題を${count}問、JSON形式で生成してください。

        # 条件
        - 文法単元: 「${unit}」
        - 想定教科書: 「${textbook}」
        - 問題形式: 'choice' (選択), 'reorder' (並べ替え), 'form-change' (語形変化), 'fill-in' (空欄補充) のいずれかを適切に割り振ること。
        - 全ての問題に、自然な日本語訳を付けること。
        - 高校入試レベルの、典型的で重要な問題を作成すること。
        - 類義表現や対義表現が学べるような、示唆に富んだ問題にすること。
        - イディオムや重要な構文を自然に含めること。

        # JSON出力形式
        - 必ず以下の構造を持つJSON配列として出力してください。
        - 'reorder'形式の場合、'question'プロパティは単語の配列にしてください。
        - 'choice'形式の場合、'options'プロパティに3つの選択肢を入れてください。

        [
          {
            "id": 1,
            "type": "choice",
            "question": "This is the most interesting movie ( _______ ) I have ever seen.",
            "options": ["which", "who", "that"],
            "answer": "that",
            "translation": "これは私が今までに見た中で最高の映画です。",
            "unit": "関係代名詞"
          }
        ]
    `;

    // Gemini APIにリクエストを送信
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }]
      }),
    });

    if (!geminiResponse.ok) {
      const error = await geminiResponse.json();
      throw new Error(JSON.stringify(error));
    }

    const data = await geminiResponse.json();
    const jsonText = data.candidates[0].content.parts[0].text;
    const cleanedJsonText = jsonText.replace(/^```json\n/, '').replace(/\n```$/, '');
    const questions = JSON.parse(cleanedJsonText);
    
    // 成功したら、生成された問題をブラウザに返す
    response.status(200).json({ questions });

  } catch (error) {
    console.error(error);
    response.status(500).json({ error: '問題の生成中にエラーが発生しました。', details: error.message });
  }
}
