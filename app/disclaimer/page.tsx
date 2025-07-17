export default function Disclaimer() {
  return (
    <div className="container mx-auto px-4 py-8 text-gray-800">
      <h1 className="mb-8 text-center text-3xl font-bold text-gray-900">
        Disclaimer
      </h1>

      <div className="mb-10 rounded-lg bg-gray-50 p-6 shadow-sm">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">
          ข้อตกลงในการใช้ซอฟต์แวร์
        </h2>
        <p className="mb-4 text-lg leading-relaxed">
          ซอฟต์แวร์นี้เป็นผลงานที่พัฒนาขึ้นโดย นายฐาพัช สระสำราญ และ นายพีรเวธน์ธีรการย์ชัย และ นายษุบิณธ
เดชอุดม จาก โรงเรียนพรหมานุสรณ์จังหวัดเพชรบุรี ภายใต้การดูแลของ นายวุฒิศักดิ์ ลีพรหหมา ภายใต้
โครงการ เว็บแอปพลิเคชันสำหรับจัดการและแบ่งปันเอกสารด้วยปัญญาประดิษฐ สำนักงานพัฒนาวิทยาศาสตร์และ
          เทคโนโลยีแห่งชาติ โดยมีวัตถุประสงค์เพื่อส่งเสริมให้นักเรียนและนักศึกษา
          ได้เรียนรู้และฝึกทักษะในการพัฒนาซอฟต์แวร์ ลิขสิทธิ์ของซอฟต์แวร์นี้จึงเป็น
          ของผู้พัฒนา ซึ่งผู้พัฒนาได้อนุญาตให้สำนักงานพัฒนาวิทยาศาสตร์และ
          เทคโนโลยีแห่งชาติ เผยแพร่ซอฟต์แวร์นี้ตาม “ต้นฉบับ” โดยไม่มีการแก้ไข
          ดัดแปลงใด ๆ ทั้งสิ้น ให้แก่บุคคลทั่วไปได้ใช้เพื่อประโยชน์ส่วนบุคคล
          หรือประโยชน์ทางการศึกษาที่ไม่มีวัตถุประสงค์ในเชิงพาณิชย์ โดยไม่คิด
          ค่าตอบแทนการใช้ซอฟต์แวร์ ดังนั้น สำนักงานพัฒนาวิทยาศาสตร์และ
          เทคโนโลยีแห่งชาติ จึงไม่มีหน้าที่ในการดูแล บำรุงรักษา จัดการอบรม
          การใช้งาน หรือพัฒนาประสิทธิภาพซอฟต์แวร์ รวมทั้งไม่รับรองความถูกต้อง
          หรือประสิทธิภาพการทำงานของซอฟต์แวร์ ตลอดจนไม่รับประกันความเสียหาย
          ต่าง ๆ อันเกิดจากการใช้ซอฟต์แวร์นี้ทั้งสิ้น
        </p>
      </div>

      {/* <hr className="my-8 border-t border-gray-300" /> */}

      <div className="rounded-lg bg-gray-50 p-6 shadow-sm">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">
          License Agreement
        </h2>
        <p className="mb-4 text-lg leading-relaxed">
          This software is a work developed by Mr.Thaphat Srasamran and Mr.Subin Det-udom and
Mr.Peerawed Theerakarnchai from Prommanusorn Phetchaburi School under the provision of
Mr.Wuttisak Leepromma under Web Application for Document Management and Sharing
Using Artificial Intelligence, which has been supported by the
          National Science and Technology Development Agency (NSTDA), in order
          to encourage pupils and students to learn and practice their skills
          in developing software. Therefore, the intellectual property of this
          software shall belong to the developer and the developer gives NSTDA
          a permission to distribute this software as an “as is” and
          non-modified software for a temporary and non-exclusive use without
          remuneration to anyone for his or her own purpose or academic
          purpose, which are not commercial purposes. In this connection, NSTDA
          shall not be responsible to the user for taking care, maintaining,
          training, or developing the efficiency of this software. Moreover,
          NSTDA shall not be liable for any error, software efficiency and
          damages in connection with or arising out of the use of the software.
        </p>
      </div>
    </div>
  );
}