
const express=require("express");
const fs=require("fs"), path=require("path"), crypto=require("crypto");
const app=express(), PORT=process.env.PORT||3000;
const DB=path.join(__dirname,"data","store.json");
const ADMIN_PASSWORD=process.env.ADMIN_PASSWORD||"petalas2026";

app.use(express.json());
app.use(express.static(path.join(__dirname,"public")));

function read(){return JSON.parse(fs.readFileSync(DB,"utf8"))}
function write(d){fs.writeFileSync(DB,JSON.stringify(d,null,2))}
function admin(req,res,next){
 if(req.headers["x-admin-password"]!==ADMIN_PASSWORD) return res.status(401).json({error:"Senha inválida"});
 next();
}

app.get("/api/store",(req,res)=>{const d=read();res.json({products:d.products,settings:d.settings})});

app.post("/api/orders",(req,res)=>{
 const {customerName,items,paymentMethod}=req.body;
 if(!customerName || !Array.isArray(items)||!items.length) return res.status(400).json({error:"Preencha o pedido."});
 const d=read(); let total=0;
 const normalized=[];
 for(const i of items){
   const p=d.products.find(x=>x.id===i.id);
   const q=Number(i.quantity)||0;
   if(!p||q<1) return res.status(400).json({error:"Produto inválido"});
   if(q>p.stock) return res.status(400).json({error:`Estoque insuficiente para ${p.name}`});
   total+=p.price*q; normalized.push({id:p.id,name:p.name,price:p.price,quantity:q});
 }
 normalized.forEach(i=>d.products.find(p=>p.id===i.id).stock-=i.quantity);
 const order={
   id:"PA-"+Date.now().toString().slice(-7),
   customerName,items:normalized,total:Number(total.toFixed(2)),
   paymentMethod,status:paymentMethod==="pix"?"Aguardando comprovante":"Novo pedido",
   createdAt:new Date().toISOString()
 };
 d.orders.unshift(order);write(d);res.status(201).json({order,settings:d.settings});
});

app.get("/api/admin/data",admin,(req,res)=>res.json(read()));
app.patch("/api/admin/products/:id",admin,(req,res)=>{
 const d=read(),p=d.products.find(x=>x.id===req.params.id);
 if(!p)return res.status(404).json({error:"Produto não encontrado"});
 if(req.body.stock!==undefined)p.stock=Math.max(0,Number(req.body.stock)||0);
 if(req.body.price!==undefined)p.price=Math.max(0,Number(req.body.price)||0);
 if(req.body.name)p.name=String(req.body.name);
 write(d);res.json(p);
});
app.patch("/api/admin/orders/:id",admin,(req,res)=>{
 const d=read(),o=d.orders.find(x=>x.id===req.params.id);
 if(!o)return res.status(404).json({error:"Pedido não encontrado"});
 o.status=req.body.status||o.status;write(d);res.json(o);
});
app.patch("/api/admin/settings",admin,(req,res)=>{
 const d=read();d.settings={...d.settings,...req.body};write(d);res.json(d.settings);
});

app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
app.listen(PORT,()=>console.log(`Pétalas de Açúcar: http://localhost:${PORT}`));
