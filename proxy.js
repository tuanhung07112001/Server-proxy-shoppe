const express = require("express");
const axios = require("axios");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

// Proxy route để gọi các API và trả về kết quả cuối cùng với job_id
app.post("/api/proxy", async (req, res) => {
  const { spc_cds, spc_si, spc_sc_session, keyword } = req.body;

  try {
    // Bước 1: Gọi API để lấy order_id dựa trên keyword
    const listApiUrl = `https://banhang.shopee.vn/api/v3/order/get_order_list_search_bar_hint?SPC_CDS=${spc_cds}&SPC_CDS_VER=2&keyword=${keyword}&category=1&order_list_tab=300&entity_type=1&order_to_ship_status=2`;

    const listResponse = await axios.get(listApiUrl, {
      headers: {
        accept: "application/json, text/plain, */*",
        cookie: `SPC_CDS=${spc_cds}; SPC_SI=${spc_si}; SPC_SC_SESSION=${spc_sc_session}`,
        "user-agent": "Mozilla/5.0",
      },
    });

    const listData = listResponse.data;

    if (listData.code === 0 && listData.data.order_sn_result.list.length > 0) {
      const orderId = listData.data.order_sn_result.list[0].order_id;

      // Bước 2: Gọi API để lấy package_number và channel_id dựa trên order_id
      const packageApiUrl = `https://banhang.shopee.vn/api/v3/order/get_package?SPC_CDS=${spc_cds}&SPC_CDS_VER=2&order_id=${orderId}`;

      const packageResponse = await axios.get(packageApiUrl, {
        headers: {
          accept: "application/json, text/plain, */*",
          cookie: `SPC_SC_SESSION=${spc_sc_session}`,
          "user-agent": "Mozilla/5.0",
        },
      });

      const packageData = packageResponse.data;

      if (
        packageData.code === 0 &&
        packageData.data.order_info.package_list.length > 0
      ) {
        const packageNumber =
          packageData.data.order_info.package_list[0].package_number;
        const channelId =
          packageData.data.order_info.package_list[0].channel_id;

        // Bước 3: Gọi API để tạo job và lấy job_id
        const jobApiUrl = `https://banhang.shopee.vn/api/v3/logistics/create_sd_jobs?SPC_CDS=${spc_cds}&SPC_CDS_VER=2&async_sd_version=0.2`;
        const jobResponse = await axios.post(
          jobApiUrl,
          {
            group_list: [
              {
                primary_package_number: packageNumber,
                group_shipment_id: 0,
                package_list: [
                  {
                    order_id: orderId,
                    package_number: packageNumber,
                  },
                ],
              },
            ],
            region_id: "VN",
            shop_id: 469040198, // Bạn có thể thay đổi giá trị shop_id và channel_id nếu cần
            channel_id: channelId,
            record_generate_schema: false,
            generate_file_details: [
              {
                file_type: "NORMAL_PDF",
                file_name: "Phiếu gửi hàng",
                file_contents: [2],
              },
            ],
          },
          {
            headers: {
              accept: "application/json, text/plain, */*",
              cookie: `SPC_SC_SESSION=${spc_sc_session}`,
              "content-type": "application/json;charset=UTF-8",
              origin: "https://banhang.shopee.vn",
              referer:
                "https://banhang.shopee.vn/portal/sale/shipment?type=toship&source=processed",
              "user-agent": "Mozilla/5.0",
            },
          }
        );

        const jobData = jobResponse.data;

        if (jobData.code === 0 && jobData.data.list.length > 0) {
          const jobId = jobData.data.list[0].job_id;

          // Trả về order_id, package_number, channel_id và job_id
          return res.json({
            success: true,
            order_id: orderId,
            package_number: packageNumber,
            channel_id: channelId,
            job_id: jobId,
          });
        } else {
          return res.json({
            success: false,
            message: "Không thể tạo job",
          });
        }
      } else {
        return res.json({
          success: false,
          message: "Không tìm thấy gói hàng",
        });
      }
    } else {
      return res.json({
        success: false,
        message: "Không tìm thấy đơn hàng",
      });
    }
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error when calling Shopee API",
      error: error.message,
    });
  }
});

// Chạy server ở cổng 3000
app.listen(3000, () => {
  console.log("Proxy server is running on http://localhost:3000");
});
