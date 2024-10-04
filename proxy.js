// proxy.js
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const app = express();

app.use(cors()); // Cho phép mọi nguồn gốc truy cập (CORS)

// Middleware để xử lý JSON
app.use(express.json());

// Định nghĩa một route cho proxy
app.post("/api/proxy", async (req, res) => {
  const { spc_cds, spc_si, spc_sc_session, keyword } = req.body;

  try {
    // Gọi API Shopee
    const listApiUrl = `https://banhang.shopee.vn/api/v3/order/get_order_list_search_bar_hint?SPC_CDS=${spc_cds}&SPC_CDS_VER=2&keyword=${keyword}&category=1&order_list_tab=300&entity_type=1&order_to_ship_status=2`;

    const response = await axios.get(listApiUrl, {
      headers: {
        accept: "application/json, text/plain, */*",
        cookie: `SPC_CDS=${spc_cds}; SPC_SI=${spc_si}; SPC_SC_SESSION=${spc_sc_session}`,
        "user-agent": "Mozilla/5.0",
      },
    });

    // Trả về kết quả cho client (trình duyệt)
    res.json(response.data);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error calling Shopee API", details: error.message });
  }
});

// Chạy server ở cổng 3000
app.listen(3000, () => {
  console.log("Proxy server running on http://localhost:3000");
});
