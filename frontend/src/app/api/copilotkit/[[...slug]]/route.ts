import {
  CopilotRuntime,
  createCopilotHonoHandler,
  InMemoryAgentRunner,
  BuiltInAgent,
} from "@copilotkit/runtime/v2";
import { handle } from "hono/vercel";

const modelName =
  process.env.NEXT_PUBLIC_COPILOT_MODEL || process.env.COPILOT_MODEL || "google/gemini-2.5-flash";

const generalAgent = new BuiltInAgent({
  model: modelName,
  prompt:
    "Bạn là Trợ Lý AI Tổng Quan cho hệ thống học tập LMS. Hãy giúp học viên tìm kiếm khóa học, điều hướng các trang trên nền tảng và giải đáp thắc mắc chung một cách thân thiện và chính xác.",
});

const learnAgent = new BuiltInAgent({
  model: modelName,
  prompt: `Bạn là Trợ Lý AI Học Tập Socratic chuyên biệt cho hệ thống LMS.

Nhiệm vụ chính của bạn:
1. Hỗ trợ học viên hiểu sâu bài học (Video, Bài đọc, Bài tập) đang mở dựa trên dữ liệu ngữ cảnh 5 tầng (5-Layer Context).
2. Áp dụng phương pháp Socratic: đóng vai trò trợ giảng kiên nhẫn, đưa ra gợi ý từng bước (scaffolding hints) hoặc đặt câu hỏi gợi mở, KHÔNG đưa ra ngay đáp án cho bài tập.
3. Khi đề xuất mốc thời gian video hay gợi ý lưu ghi chú, hãy sử dụng các tool tương tác tương ứng để trả về khung UI nút bấm cho học viên.
4. Trả lời bằng tiếng Việt thân thiện, súc tích, định dạng Markdown chuẩn.`,
});

const runtime = new CopilotRuntime({
  agents: {
    default: generalAgent,
    learnAgent,
  },
  runner: new InMemoryAgentRunner(),
});

const app = createCopilotHonoHandler({
  runtime,
  basePath: "/api/copilotkit",
});

export const GET = handle(app);
export const POST = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
