import React, { useState, useEffect } from "react";
import Modal from "react-modal"; // Import Modal
import axios from "axios";
import { gapi } from "gapi-script";
import { useAuth } from "../../AuthContext";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// ตั้งค่า root element สำหรับ Modal
Modal.setAppElement("#root");

export default function Main() {
  const { profile } = useAuth(); // Get the profile from context
  const api =
    "https://api.sheetbest.com/sheets/109b8a8f-0fd6-43df-92d9-85fb7859ff84";

  const [data, setData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [searchQuery, setSearchQuery] = useState("");
  const [exportedSheetLink, setExportedSheetLink] = useState(""); // State for the exported sheet link
  const [exportStatus, setExportStatus] = useState(""); // State for export status message
  const [selectedProfile, setSelectedProfile] = useState(null); // State for selected profile
  const [isModalOpen, setIsModalOpen] = useState(false); // State for modal visibility

  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false); // State สำหรับการเปิด/ปิด Modal ของลิงก์
  const [currentLink, setCurrentLink] = useState(""); // State สำหรับเก็บลิงก์ปัจจุบัน

  useEffect(() => {
    axios.get(api).then((res) => setData(res.data));
  }, []);

  useEffect(() => {
    gapi.load("client:auth2", async () => {
      try {
        // Initialize the gapi client
        await gapi.client.init({
          apiKey: "AIzaSyDzlh5zjMXd7u-h-sDOLbYTfBk-JpuBHJA", // Replace with your API Key
          clientId:
            "203839487252-3ak600daa8gq81q1jn0ld1e76isnlkb7.apps.googleusercontent.com", // Replace with your OAuth Client ID
          scope:
            "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file",
          discoveryDocs: [
            "https://sheets.googleapis.com/$discovery/rest?version=v4",
            "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest", // Load Drive API
          ],
        });

        console.log("gapi client initialized");
      } catch (error) {
        console.error("Error initializing gapi client:", error);
      }
    });
  }, []);

  if (!data || data.length === 0) {
    return <div>Loading...</div>;
  }

  // Sort handler
  const handleSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  // Sorting data
  const sortedData = [...data].sort((a, b) => {
    if (!sortConfig.key) return 0;

    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];

    if (sortConfig.key === "id") {
      return sortConfig.direction === "ascending"
        ? Number(aValue) - Number(bValue)
        : Number(bValue) - Number(aValue);
    }

    if (aValue < bValue) {
      return sortConfig.direction === "ascending" ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === "ascending" ? 1 : -1;
    }
    return 0;
  });

  // Filter data based on search query
  const filteredData = sortedData.filter((item) => {
    const query = searchQuery.toLowerCase();
    // console.log(query);
    return (
      item.id.toString().toLowerCase().includes(query) ||
      item.first_name.toLowerCase().includes(query) ||
      item.last_name.toLowerCase().includes(query) ||
      item.email.toLowerCase().includes(query) ||
      item.gender.toLowerCase().includes(query) ||
      item.state.toLowerCase().includes(query) ||
      item.street_address.toLowerCase().includes(query) ||
      item.country.toLowerCase().includes(query) ||
      item.country_code.toLowerCase().includes(query) ||
      item.job_title.toLowerCase().includes(query) ||
      item.company_name.toLowerCase().includes(query)
    );
  });

  // Pagination
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);

  // Page change handler
  const handlePageChange = (page) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Rows per page change handler
  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(Number(event.target.value));
    setCurrentPage(1);
  };

  // Export data to Google Sheet
  const exportToGoogleSheet = async () => {
    try {
      const auth = gapi.auth2.getAuthInstance();

      // ตรวจสอบว่าผู้ใช้ลงชื่อเข้าใช้หรือยัง ถ้ายังให้เข้าสู่ระบบ
      if (!auth.isSignedIn.get()) {
        await auth.signIn();
      }

      const sheets = gapi.client.sheets.spreadsheets;
      const drive = gapi.client.drive;

      // สร้าง Google Sheet ใหม่
      const createResponse = await sheets.create({
        resource: {
          properties: {
            title: "Exported Data Sheet",
          },
        },
      });

      const spreadsheetId = createResponse.result.spreadsheetId;

      // รับข้อมูลรายละเอียดของ Spreadsheet
      const spreadsheetDetails = await sheets.get({ spreadsheetId });
      const sheetName = spreadsheetDetails.result.sheets[0].properties.title;

      // ตรวจสอบข้อมูลก่อนการส่งออก
      if (!data || data.length === 0) {
        throw new Error("ไม่มีข้อมูลสำหรับการส่งออก");
      }

      // เพิ่มข้อมูลลงใน Google Sheet
      await sheets.values.update({
        spreadsheetId: spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: "RAW",
        resource: {
          values: [
            Object.keys(filteredData[0]), // แถวหัวข้อ
            ...filteredData.map((item) => Object.values(item)), // แถวข้อมูล
          ],
        },
      });

      // แชร์ลิงก์ของไฟล์ให้ทุกคนสามารถเข้าถึงได้
      await drive.permissions.create({
        fileId: spreadsheetId,
        resource: {
          role: "reader",
          type: "anyone",
        },
      });

      // อัปเดตลิงก์ของไฟล์ที่ส่งออก
      setExportedSheetLink(
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
      );

      // แสดงข้อความแจ้งเตือนสำเร็จ
      toast.success("ส่งออกข้อมูลเรียบร้อย! คุณสามารถคลิกลิงก์เพื่อดูไฟล์ได้");
    } catch (error) {
      console.error("Error exporting data to Google Sheet:", error);
      toast.error("เกิดข้อผิดพลาดในการส่งออกข้อมูล โปรดลองอีกครั้ง");
    }
  };

  const openModal = (profile) => {
    setSelectedProfile(profile);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedProfile(null);
  };

  const openLinkModal = (link) => {
    setCurrentLink(link);
    setIsLinkModalOpen(true);
  };

  // ฟังก์ชันสำหรับปิด Modal ของลิงก์
  const closeLinkModal = () => {
    setCurrentLink("");
    setIsLinkModalOpen(false);
  };

  if (!profile) {
    return <div>Please log in to view data</div>;
  }

  return (
    <div className="container mt-4">
      {/* Display logged-in user's profile */}
      <div>
        <h3>Welcome, {profile.name}!</h3>
        <br />
      </div>

      {/* Search Input */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border border-gray-300 rounded px-4 py-2 w-full"
        />
      </div>

      {filteredData.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="table-auto w-[2100px] border-collapse border border-gray-200 bg-white shadow-md rounded-lg">
            <thead className="bg-gray-100 text-gray-800 uppercase text-sm font-bold">
              <tr>
                <th
                  onClick={() => handleSort("id")}
                  className="border border-gray-200 px-4 py-2 text-center cursor-pointer"
                >
                  Key{" "}
                  {sortConfig.key === "id" &&
                    (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </th>
                <th
                  onClick={() => handleSort("first_name")}
                  className="border border-gray-200 px-4 py-2 text-center cursor-pointer"
                >
                  First Name{" "}
                  {sortConfig.key === "first_name" &&
                    (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </th>
                <th
                  onClick={() => handleSort("last_name")}
                  className="border border-gray-200 px-4 py-2 text-center cursor-pointer"
                >
                  Last Name{" "}
                  {sortConfig.key === "last_name" &&
                    (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </th>
                <th
                  onClick={() => handleSort("email")}
                  className="border border-gray-200 px-4 py-2 text-center cursor-pointer"
                >
                  E-Mail{" "}
                  {sortConfig.key === "email" &&
                    (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </th>
                <th
                  onClick={() => handleSort("gender")}
                  className="border border-gray-200 px-4 py-2 text-center cursor-pointer"
                >
                  Gender{" "}
                  {sortConfig.key === "gender" &&
                    (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </th>
                <th
                  onClick={() => handleSort("city")}
                  className="border border-gray-200 px-4 py-2 text-center cursor-pointer"
                >
                  City{" "}
                  {sortConfig.key === "city" &&
                    (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </th>
                <th
                  onClick={() => handleSort("country")}
                  className="border border-gray-200 px-4 py-2 text-center cursor-pointer"
                >
                  country{" "}
                  {sortConfig.key === "country" &&
                    (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </th>
                <th
                  onClick={() => handleSort("country_code")}
                  className="border border-gray-200 px-4 py-2 text-center cursor-pointer"
                >
                  country code{" "}
                  {sortConfig.key === "country_code" &&
                    (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </th>
                <th
                  onClick={() => handleSort("state")}
                  className="border border-gray-200 px-4 py-2 text-center cursor-pointer"
                >
                  State{" "}
                  {sortConfig.key === "state" &&
                    (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </th>
                <th
                  onClick={() => handleSort("street_address")}
                  className="border border-gray-200 px-4 py-2 text-center cursor-pointer"
                >
                  Street Address{" "}
                  {sortConfig.key === "street_address" &&
                    (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </th>
                <th
                  onClick={() => handleSort("job_title")}
                  className="border border-gray-200 px-4 py-2 text-center cursor-pointer"
                >
                  Job title{" "}
                  {sortConfig.key === "last_name" &&
                    (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </th>
                <th
                  onClick={() => handleSort("company_name")}
                  className="border border-gray-200 px-4 py-2 text-center cursor-pointer"
                >
                  Company Name{" "}
                  {sortConfig.key === "company_name" &&
                    (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </th>
              </tr>
            </thead>
            <tbody>
              {currentData.map((val, idx) => (
                <tr
                  key={idx}
                  onClick={() => openModal(val)}
                  className={`${
                    idx % 2 === 0 ? "bg-gray-50" : "bg-white"
                  } hover:bg-gray-100`}
                >
                  <td className="border border-gray-200 px-4 py-2 text-gray-900 text-left">
                    {val.id}
                  </td>
                  <td className="border border-gray-200 px-4 py-2 text-gray-900 text-left">
                    {val.first_name}
                  </td>
                  <td className="border border-gray-200 px-4 py-2 text-gray-900 text-left">
                    {val.last_name}
                  </td>
                  <td className="border border-gray-200 px-4 py-2 text-gray-900 text-left">
                    {val.email}
                  </td>
                  <td className="border border-gray-200 px-4 py-2 text-gray-900 text-left">
                    {val.gender}
                  </td>
                  <td className="border border-gray-200 px-4 py-2 text-gray-900 text-left">
                    {val.city}
                  </td>
                  <td className="border border-gray-200 px-4 py-2 text-gray-900 text-left">
                    {val.country}
                  </td>
                  <td className="border border-gray-200 px-4 py-2 text-gray-900 text-left">
                    {val.country_code}
                  </td>
                  <td className="border border-gray-200 px-4 py-2 text-gray-900 text-left">
                    {val.state}
                  </td>
                  <td className="border border-gray-200 px-4 py-2 text-gray-900 text-left">
                    {val.state_address}
                  </td>
                  <td className="border border-gray-200 px-4 py-2 text-gray-900 text-left">
                    {val.job_title}
                  </td>
                  <td className="border border-gray-200 px-4 py-2 text-gray-900 text-left">
                    {val.company_name}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <Modal
            isOpen={isModalOpen}
            onRequestClose={closeModal}
            className="container mx-auto"
          >
            {selectedProfile && (
              <div className="modal-box mx-auto">
                <h2 className="text-xl font-bold mb-4">Profile Details</h2>
                <img
                  src={selectedProfile.photo}
                  alt="profile"
                  className="mx-auto object-contain h-48 w-96"
                />
                <br />
                <p className="text-xl">
                  <strong>ID:</strong> {selectedProfile.id}
                </p>
                <p className="text-xl">
                  <strong>First Name:</strong> {selectedProfile.first_name}
                </p>
                <p className="text-xl">
                  <strong>Last Name:</strong> {selectedProfile.last_name}
                </p>
                <p className="text-xl">
                  <strong>E-Mail:</strong> {selectedProfile.email}
                </p>
                <p className="text-xl">
                  <strong>Gender:</strong> {selectedProfile.gender}
                </p>
                <p className="text-xl">
                  <strong>City:</strong> {selectedProfile.city}
                </p>
                <p className="text-xl">
                  <strong>Country:</strong> {selectedProfile.country}
                </p>
                <p className="text-xl">
                  <strong>State:</strong> {selectedProfile.state}
                </p>
                <p className="text-xl">
                  <strong>Street Address:</strong>{" "}
                  {selectedProfile.street_address}
                </p>
                <p className="text-xl">
                  <strong>Job Title:</strong> {selectedProfile.job_title}
                </p>
                <p className="text-xl">
                  <strong>Company Name:</strong> {selectedProfile.company_name}
                </p>
                <button
                  onClick={closeModal}
                  className="mt-4 bg-red-500 text-white px-4 py-2 rounded"
                >
                  Close
                </button>
              </div>
            )}
          </Modal>
        </div>
      ) : (
        <p className="bg-w">No data found</p>
      )}

      {/* Rows Per Page Selector */}
      <div className="flex justify-between items-center mt-4">
        <div>
          <label className="text-white-700">
            Rows per page:{" "}
            <select
              value={rowsPerPage}
              onChange={handleRowsPerPageChange}
              className="border border-gray-300 rounded px-2 py-1"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handlePageChange(1)}
            className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
            disabled={currentPage === 1}
          >
            First
          </button>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span className="text-white-700">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
            disabled={currentPage === totalPages}
          >
            Next
          </button>
          <button
            onClick={() => handlePageChange(totalPages)}
            className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
            disabled={currentPage === totalPages}
          >
            Last
          </button>
        </div>
      </div>

      {/* ปุ่มส่งออก */}
      <div className="mt-4">
        <button
          onClick={exportToGoogleSheet}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Export to Google Sheet
        </button>
        {exportedSheetLink && (
          <button
            onClick={() => openLinkModal(exportedSheetLink)}
            className="mt-4 text-blue-500 underline"
          >
            View Exported Sheet
          </button>
        )}
      </div>

      <Modal
        isOpen={isLinkModalOpen}
        onRequestClose={closeLinkModal}
        className="container mx-auto p-4 bg-white shadow-lg rounded"
      >
        <div className="flex flex-col items-center">
          <h2 className="text-xl font-bold mb-4">Exported Sheet Link</h2>
          {currentLink ? (
            <a
              href={currentLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 underline text-lg"
            >
              {currentLink}
            </a>
          ) : (
            <p>No link available</p>
          )}
          <button
            onClick={closeLinkModal}
            className="mt-4 bg-red-500 text-white px-4 py-2 rounded"
          >
            Close
          </button>
        </div>
      </Modal>

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}
