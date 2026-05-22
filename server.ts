import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// API: Optimize weekly schedule
app.post("/api/ai/optimize-schedule", async (req, res) => {
  try {
    const { tasks, userContext } = req.body;
    
    const prompt = `
      Bạn là một chuyên gia quản lý thời gian. Hãy giúp tôi tối ưu hóa lịch làm việc cho 1 tuần dựa trên các công việc sau:
      ${JSON.stringify(tasks)}
      
      Ngữ cảnh người dùng: ${userContext || 'Không có'}
      
      Yêu cầu:
      1. Chia lịch cụ thể từng ngày trong tuần (thứ 2 đến chủ nhật).
      2. TỐI ƯU THỨ TỰ CÔNG VIỆC:
         - Deadline sớm nhất: Đưa lên ĐẦU danh sách của ngày.
         - Duration (thời gian thực hiện) dài nhất: Đưa xuống CUỐI danh sách của ngày.
         - Cân đối khối lượng công việc giữa các ngày (mỗi ngày khoảng 8-10 tiếng làm việc).
      3. RÀNG BUỘC THỜI GIAN:
         - Khung giờ làm việc chính: 08:00 - 20:00.
         - Chiều Thứ 7 và Cả ngày Chủ nhật: Ưu tiên nghỉ ngơi, chỉ xếp các task lặp lại (cycle) hoặc task cực kỳ nhẹ nhàng.
      4. Kết quả trả về cho 7 ngày của tuần hiện tại.
      
      Kết quả trả về định dạng JSON:
      {
        "days": [
          {
            "day": "Thứ 2",
            "tasks": [
              { "time": "08:00", "taskName": "...", "duration": "Số phút", "priority": "high/medium/low", "reason": "Tại sao xếp ở đây" }
            ]
          },
          ...
        ],
        "recommendations": "Lời khuyên tổng quát để đạt hiệu quả cao nhất"
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      }
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error) {
    console.error("AI Error:", error);
    res.status(500).json({ error: "Failed to optimize schedule" });
  }
});

async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

start();
