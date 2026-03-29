import express from 'express';


const app = express();
const PORT = 3000;

app.set("view engine", "ejs");
app.use(express.static("public"));

const data = [
    {
      item_name: "Medicine A",
      batch_no: "B123",
      exp: "Jan-26",
      rate: 10,
      quantity: 2,
      amount: 20
    },
    {
      item_name: "Medicine B",
      batch_no: "B456",
      exp: "Feb-26",
      rate: 15,
      quantity: 3,
      amount: 45
    }
    ,{
      item_name: "Medicine B",
      batch_no: "B456",
      exp: "Feb-26",
      rate: 15,
      quantity: 3,
      amount: 45
    }
    ,{
      item_name: "Medicine B",
      batch_no: "B456",
      exp: "Feb-26",
      rate: 15,
      quantity: 3,
      amount: 45
    }
    ,{
      item_name: "Medicine B",
      batch_no: "B456",
      exp: "Feb-26",
      rate: 15,
      quantity: 3,
      amount: 45
    }
    ,{
      item_name: "Medicine B",
      batch_no: "B456",
      exp: "Feb-26",
      rate: 15,
      quantity: 3,
      amount: 45
    }
    ,{
      item_name: "Medicine B",
      batch_no: "B456",
      exp: "Feb-26",
      rate: 15,
      quantity: 3,
      amount: 45
    }
    ,{
      item_name: "Medicine B",
      batch_no: "B456",
      exp: "Feb-26",
      rate: 15,
      quantity: 3,
      amount: 45
    }
    ,{
      item_name: "Medicine B",
      batch_no: "B456",
      exp: "Feb-26",
      rate: 15,
      quantity: 3,
      amount: 45
    }
    ,{
      item_name: "Medicine B",
      batch_no: "B456",
      exp: "Feb-26",
      rate: 15,
      quantity: 3,
      amount: 45
    }
    ,{
      item_name: "Medicine B",
      batch_no: "B456",
      exp: "Feb-26",
      rate: 15,
      quantity: 3,
      amount: 45
    }
    ,{
      item_name: "Medicine B",
      batch_no: "B456",
      exp: "Feb-26",
      rate: 15,
      quantity: 3,
      amount: 45
    }
    ,{
      item_name: "Medicine B",
      batch_no: "B456",
      exp: "Feb-26",
      rate: 15,
      quantity: 3,
      amount: 45
    }
    ,{
      item_name: "Medicine B",
      batch_no: "B456",
      exp: "Feb-26",
      rate: 15,
      quantity: 3,
      amount: 45
    }
  ];

  
app.get('/', (req, res) => {
    res.render("template", { data , date: "10-03-2026" , invoice_no: "INV-001" , patient_name: "John Doe" , ip_no: "IP-001" , hospital_name: "City Hospital" , unit: "Cardiology" , address: "123 Main St, City" , gst_no: "07AAKFN5053A1ZK" , total_amount: 65 });
});

app.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
});