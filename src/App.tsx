// @ts-nocheck
import React, { useState, useEffect, Fragment, useRef } from "react";

// ─── ACTIVITY LOG (defined early — used by multiple components) ──────────────
const LOG_KEY="ordertrack-activitylog";
const logActivity=async(action:string,detail:string,user:string)=>{
  try{
    const K="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4eHJ4bnl4Zm1nY2R6eGNpZ2R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMTg5MzIsImV4cCI6MjA5NTc5NDkzMn0.wF2mt8BK1KGk-VyK4zZQvFGJCxCp8UGDPdgT_8DHc6o";
    const B="https://vxxrxnyxfmgcdzxcigdw.supabase.co";
    const r=await fetch(B+"/rest/v1/ordertrack_data?apikey="+K+"&user_key=eq."+LOG_KEY+"&select=payload&limit=1",
      {headers:{"apikey":K,"Authorization":"Bearer "+K}});
    const rows=r.ok?await r.json():[];
    const logs=rows?.[0]?.payload?.logs||[];
    const entry={ts:new Date().toISOString(),action,detail,user};
    const updated=[entry,...logs].slice(0,500);
    await fetch(B+"/rest/v1/ordertrack_data?apikey="+K,{
      method:"POST",
      headers:{"Content-Type":"application/json","apikey":K,"Authorization":"Bearer "+K,"Prefer":"resolution=merge-duplicates,return=minimal"},
      body:JSON.stringify({user_key:LOG_KEY,payload:{logs:updated}})
    });
  }catch(e){console.warn("[Log]",e);}
};

// ─── SUPABASE CLOUD SYNC (pure fetch — no package needed) ────────────────────
const SUPABASE_URL = "https://vxxrxnyxfmgcdzxcigdw.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4eHJ4bnl4Zm1nY2R6eGNpZ2R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMTg5MzIsImV4cCI6MjA5NTc5NDkzMn0.wF2mt8BK1KGk-VyK4zZQvFGJCxCp8UGDPdgT_8DHc6o";
const USER_KEY     = "ordertrack-main";
const SB_AUTH      = "Bearer " + "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4eHJ4bnl4Zm1nY2R6eGNpZ2R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMTg5MzIsImV4cCI6MjA5NTc5NDkzMn0.wF2mt8BK1KGk-VyK4zZQvFGJCxCp8UGDPdgT_8DHc6o";
const SB_HEADERS   = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_KEY,
  "Authorization": SB_AUTH,
};

const cloudLoad = async (): Promise<any|null> => {
  try {
    const url=SUPABASE_URL+"/rest/v1/ordertrack_data?apikey="+SUPABASE_KEY+"&user_key=eq."+USER_KEY+"&select=payload,updated_at&limit=1";
    const res = await fetch(url, {
      headers: {...SB_HEADERS, "Prefer": "return=representation"}
    });
    if(!res.ok){ console.warn("[CloudLoad] Error:", res.status); return null; }
    const rows = await res.json();
    if(!rows?.[0]) return null;
    return {payload: rows[0].payload, updatedAt: rows[0].updated_at};
  } catch(e) { console.warn("[CloudLoad] Exception:",e); return null; }
};

const cloudSave = async (payload: any): Promise<boolean> => {
  const K = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4eHJ4bnl4Zm1nY2R6eGNpZ2R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMTg5MzIsImV4cCI6MjA5NTc5NDkzMn0.wF2mt8BK1KGk-VyK4zZQvFGJCxCp8UGDPdgT_8DHc6o";
  const B = "https://vxxrxnyxfmgcdzxcigdw.supabase.co";
  const H = {"Content-Type":"application/json","apikey":K,"Authorization":"Bearer "+K};
  try {
    // Try PATCH first (update existing row)
    const patch = await fetch(B+"/rest/v1/ordertrack_data?apikey="+K+"&user_key=eq.ordertrack-main",{
      method:"PATCH", headers:{...H,"Prefer":"return=minimal"},
      body:JSON.stringify({payload})
    });
    if(patch.status===204||patch.status===200){
      console.log("[CloudSave] PATCH OK");
      return true;
    }
    // If PATCH failed (no row), try INSERT
    const post = await fetch(B+"/rest/v1/ordertrack_data?apikey="+K,{
      method:"POST", headers:{...H,"Prefer":"resolution=merge-duplicates,return=minimal"},
      body:JSON.stringify({user_key:"ordertrack-main", payload})
    });
    const ok2 = post.status===201||post.status===200||post.status===204;
    console.log("[CloudSave] POST status:", post.status, ok2?"OK":"FAIL");
    if(!ok2){ const e=await post.text(); console.warn("[CloudSave] Error:",e); }
    return ok2;
  } catch(e){ console.warn("[CloudSave] Exception:",e); return false; }
};

// ─── SUPABASE FILE STORAGE ────────────────────────────────────────────────────
const SB_STORAGE_URL = "https://vxxrxnyxfmgcdzxcigdw.supabase.co/storage/v1";
const SB_K = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4eHJ4bnl4Zm1nY2R6eGNpZ2R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMTg5MzIsImV4cCI6MjA5NTc5NDkzMn0.wF2mt8BK1KGk-VyK4zZQvFGJCxCp8UGDPdgT_8DHc6o";
const BUCKET = "ordertrack-files";

const uploadFile = async (file: File, path: string): Promise<string|null> => {
  try {
    const res = await fetch(`${SB_STORAGE_URL}/object/${BUCKET}/${path}`, {
      method: "POST",
      headers: { "apikey": SB_K, "Authorization": "Bearer "+SB_K, "Content-Type": file.type },
      body: file,
    });
    if(!res.ok){ const e=await res.text(); console.warn("[Upload]",e); return null; }
    return `${SB_STORAGE_URL}/object/public/${BUCKET}/${path}`;
  } catch(e){ console.warn("[Upload]",e); return null; }
};

const deleteFile = async (path: string): Promise<boolean> => {
  try {
    const res = await fetch(`${SB_STORAGE_URL}/object/${BUCKET}/${path}`, {
      method: "DELETE",
      headers: { "apikey": SB_K, "Authorization": "Bearer "+SB_K },
    });
    return res.ok;
  } catch { return false; }
};

const getFileUrl = (path: string) => `${SB_STORAGE_URL}/object/public/${BUCKET}/${path}`;

// ─── I18N ─────────────────────────────────────────────────────────────────────
type Lang="fr"|"en";
const T:Record<Lang,Record<string,string>>={
  fr:{
    // Nav
    nav_dashboard:"Tableau de bord", nav_compilation:"Compilation", nav_clients:"Customers",
    nav_add_client:"Ajouter", nav_search:"Recherche globale",
    // General
    loading:"Chargement…", save:"Enregistrer", cancel:"Annuler", delete:"Supprimer",
    confirm_del_client:'Supprimer "{name}" et toutes ses données ?',
    confirm_del_order:"Supprimer cette commande ?",
    confirm_del_invoice:"Supprimer cette facture ?",
    confirm_del_payment:"Supprimer ce paiement ?",
    // Dashboard
    page_dashboard:"Tableau de bord", page_compilation:"Compilation",
    kpi_clients:"Customers", kpi_orders:"Commandes", kpi_po:"Total PO",
    kpi_invoiced:"Facturé", kpi_collected:"Encaissé", kpi_outstanding:"Factures en cours",
    kpi_active:"actifs", kpi_no_invoice:"sans facture",
    kpi_invoiced_pct:"% du PO", kpi_collected_pct:"% des factures",
    kpi_overdue_suffix:"échu", kpi_upcoming_suffix:"à venir", kpi_no_alert:"Aucune alerte",
    global_progress:"Progression globale", billing_rate:"Taux de facturation",
    collection_rate:"Taux d'encaissement", alerts_panel:"Alertes & Échéances",
    all_good:"Tout est en ordre", no_alerts:"Aucune alerte en cours",
    overdue_section:"Factures échues", upcoming_section:"Prochaines échéances",
    other_alerts:"Autres alertes", total_overdue:"Total échu non réglé",
    total_upcoming:"Total à encaisser prochainement",
    monthly_chart:"Évolution mensuelle", status_chart:"Statuts commandes",
    no_orders_kpi:"Aucune commande",
    ranking:"Classement clients", rank_account:"N° Compte", rank_conditions:"Conditions paiement",
    rank_cmds:"Cmds", rank_factor:"Tx Fact.",
    // Compilation
    consol_view:"Vue consolidée · tous les clients · {n} comptes actifs",
    total_po_year:"Total PO {y}", invoiced_total:"Facturé", open_orders:"Open Orders",
    open_label:"OPEN ORDERS", remain_to_invoice:"Remaining to invoice",
    ranking_po:"Classement PO par client", monthly_activity:"Activité mensuelle {y}",
    // Customer page
    order_management:"Gestion des commandes {y}",
    edit_client:"Modifier", no_orders_msg:"Aucune commande — utilisez le bouton + pour commencer.",
    add_first_order:"Aucune commande — cliquez sur « Nouvelle commande » pour commencer.",
    invoiced_label:"Facturé", remaining_label:"Reste", collected_label:"Encaissé",
    late_delivery:"{n} livraison{s} en retard", overdue_pay:"{n} paiement{s} à surveiller",
    kpi_total_po:"PO total", kpi_invoiced:"Facturé", kpi_collected:"Encaissé",
    kpi_overdue_client:"Factures échues", kpi_outstanding_client:"En cours (non échu)",
    kpi_open:"Open orders", commanded:"Commandé", late_label:"Facturé non réglé",
    outstanding_wait:"Factures en attente", remain_invoice:"Remaining to invoice",
    // Tabs
    tab_orders:"Commandes", tab_invoices:"Factures", tab_payments:"Paiements",
    search_orders:"Chercher PO #, S/O, statut…",
    search_invoices:"Chercher N° facture, PO…",
    search_payments:"Chercher réf. paiement, mode…",
    results:"{n} résultat{s}", no_results:"Aucune {type} trouvé{e}",
    show_more:"Afficher les {n} {type} suivant{s}", collapse:"Réduire",
    // Orders
    btn_new_order:"Nouvelle commande", btn_add_invoice:"Ajouter facture",
    col_po:"PO #", col_so:"S/O", col_order_num:"N° Commande", col_date:"Date",
    col_amount:"Montant PO", col_invoiced_remain:"Facturé / Reste", col_collected:"Encaissé",
    col_delivery_mode:"Mode livraison", col_expected:"Date prévue",
    col_nb_invoices:"Nb factures", col_notes:"Notes",
    delay_days:"{n}j de retard", in_days:"Dans {n}j",
    invoice_section:"Expéditions & Factures", no_invoice_yet:"Aucune facture pour cette commande",
    // Invoices
    col_invoice:"Invoice #", col_due:"Échéance", col_paid:"Payé",
    col_remain:"Reste", col_status:"Statut", col_actions:"Actions",
    payments_received:"Paiements reçus", total_paid:"Total payé",
    remaining_due:"Reste", fully_settled:"✓ Entièrement réglé",
    // Payments
    col_method:"Mode", col_ref:"Référence",
    total_shown:"Total affiché", payments_total:"paiement{s}",
    global_total:"Total global",
    // Modals
    new_client:"Nouveau client", edit_client_title:"Modifier le client",
    client_name:"Nom du client *", account_num:"N° de compte",
    pay_terms:"Conditions de paiement", custom_days:"Délai en jours",
    uppercase_note:"Le nom sera automatiquement mis en majuscules.",
    auto_due:"Échéances automatiques :", due_advance:"Paiement lié à la livraison.",
    due_immediate:"Paiement comptant — dû le jour de l'édition.",
    due_days:"Calculé automatiquement ({n} jours après la facture).",
    create_client:"Créer le client", save_changes:"Enregistrer les modifications",
    new_order:"Nouvelle commande", edit_order:"Modifier la commande",
    order_date:"Date commande *", po_number:"PO # Customer *",
    so_number:"S/O # *", order_number_cimelec:"N° Commande (CIMELEC)",
    amount:"Montant (€) *", delivery_mode:"Mode de livraison",
    expected_date:"Date livraison prévue", order_notes:"Notes",
    order_status_title:"Statut de la commande *",
    create_order:"Créer la commande", save_order:"Enregistrer",
    new_invoice:"Nouvelle expédition / Facture", edit_invoice:"Modifier la facture",
    invoice_number:"Invoice # *", invoice_date:"Date facture *",
    invoice_amount:"Montant (€) *", shipping_mode:"Mode expédition",
    due_date_field:"Date d'échéance paiement", force_manual:"Forcer manuellement",
    calculated:"Calculé", already_invoiced:"Déjà facturé", po_remain:"Reste",
    invoice_notes:"Notes", create_invoice:"Créer la facture", save_invoice:"Enregistrer",
    record_payment:"Enregistrer un paiement", edit_payment:"Modifier le paiement",
    pay_date:"Date du paiement *", pay_amount:"Montant reçu (€) *",
    pay_method:"Mode de paiement", pay_ref:"Référence / N° virement",
    pay_notes:"Observations…", validate_payment:"Valider le paiement",
    already_paid:"Déjà payé", remain_to_pay:"Reste",
    // Reports
    report_title:"Générer un rapport PDF", report_sub:"Sélectionnez le type et la période",
    report_generate:"Générer & Imprimer",
    r_open:"Open Orders", r_open_desc:"Commandes non entièrement facturées",
    r_overdue:"Factures échues", r_overdue_desc:"Échéance dépassée, solde non réglé",
    r_upcoming:"Échéances à venir", r_upcoming_desc:"Factures dues dans les 30 prochains jours",
    r_unpaid:"Factures en cours", r_unpaid_desc:"Solde non encore encaissé (toutes)",
    r_all:"Toutes les factures", r_all_desc:"Listing complet sur la période",
    r_summary:"Synthèse clients", r_summary_desc:"Récapitulatif par client",
    date_from:"Date de début", date_to:"Date de fin",
    clients_included:"Customers inclus", all_clients:"Tous", no_clients:"Aucun",
    // Alerts ticker
    alert_label:"ALERTE",
    a_overdue:"{n} facture{s} échue{s}", a_overdue_detail:"{amt} € à recouvrer",
    a_fact_non_exp:"{n} commande{s} facturée{s} non expédiée{s}",
    a_soon:"{n} échéance{s} dans les 7 prochains jours", a_soon_detail:"{amt} € à encaisser",
    a_fdi:"{n} commande{s} en attente FDI",
    a_late:"{n} livraison{s} en retard",
    // Status labels
    s_en_cours:"En cours", s_attente_fdi:"En attente FDI",
    s_partiel:"Prête (partielle)", s_prete:"Prête (complète)",
    s_expediee:"Expédiée", s_exp_fact:"Expédiée + Facturée",
    s_fact_non_exp:"Facturée non expédiée", s_livree:"Livrée",
    s_livree_part:"Livrée (partielle)", s_annule:"Annulée",
    // Search
    search_placeholder:"Rechercher un PO #, S/O, facture, référence…",
    search_hint:"Tapez au moins 2 caractères pour rechercher",
    search_empty:"Aucun résultat pour « {q} »",
    type_order:"Commande", type_invoice:"Facture", type_payment:"Paiement",
    click_to_open:"Cliquer pour ouvrir et modifier",
    // Pay status
    ps_paid:"✓ Soldé", ps_partial_en_cours:"En cours · partiel", ps_en_cours:"En cours",
    ps_today:"Échéance aujourd'hui", ps_soon_part:"Dans {n}j · partiel",
    ps_soon:"Échéance dans {n}j", ps_ov_part:"Échu {n}j · partiel",
    ps_overdue:"Échu depuis {n} jour{s}", ps_due:"En cours — éch. {date}",
    // Tags
    tag_retard:"⏰ RETARD LIVR.", tag_solde:"✓ SOLDÉ", tag_echue:"⚠ {n} ÉCHU{E} · {amt} €",
    tag_proche:"🔔 {n} ÉCHÉANCE{S} PROCHE{S}", tag_encaisse:"{n}% ENCAISSÉ",
  },
  en:{
    // Nav
    nav_dashboard:"Dashboard", nav_compilation:"Compilation", nav_clients:"Customers",
    nav_add_client:"Add", nav_search:"Global search",
    // General
    loading:"Loading…", save:"Save", cancel:"Cancel", delete:"Delete",
    confirm_del_client:'Delete "{name}" and all its data?',
    confirm_del_order:"Delete this order?",
    confirm_del_invoice:"Delete this invoice?",
    confirm_del_payment:"Delete this payment?",
    // Dashboard
    page_dashboard:"Dashboard", page_compilation:"Compilation",
    kpi_clients:"Customers", kpi_orders:"Orders", kpi_po:"Total PO",
    kpi_invoiced:"Invoiced", kpi_collected:"Collected", kpi_outstanding:"Outstanding",
    kpi_active:"active", kpi_no_invoice:"without invoice",
    kpi_invoiced_pct:"% of PO", kpi_collected_pct:"% of invoices",
    kpi_overdue_suffix:"overdue", kpi_upcoming_suffix:"upcoming", kpi_no_alert:"No alerts",
    global_progress:"Global progress", billing_rate:"Invoicing rate",
    collection_rate:"Collection rate", alerts_panel:"Alerts & Due Dates",
    all_good:"All clear", no_alerts:"No active alerts",
    overdue_section:"Overdue invoices", upcoming_section:"Upcoming due dates",
    other_alerts:"Other alerts", total_overdue:"Total overdue unpaid",
    total_upcoming:"Total to collect soon",
    monthly_chart:"Monthly evolution", status_chart:"Order statuses",
    no_orders_kpi:"No orders",
    ranking:"Customer ranking", rank_account:"Account #", rank_conditions:"Payment terms",
    rank_cmds:"Orders", rank_factor:"Inv. rate",
    // Compilation
    consol_view:"Consolidated view · all clients · {n} active accounts",
    total_po_year:"Total PO {y}", invoiced_total:"Invoiced", open_orders:"Open Orders",
    open_label:"OPEN ORDERS", remain_to_invoice:"Remaining to invoice",
    ranking_po:"PO ranking by client", monthly_activity:"Monthly activity {y}",
    // Customer page
    order_management:"Order management {y}",
    edit_client:"Edit", no_orders_msg:"No orders — use the + button to get started.",
    add_first_order:"No orders yet — click « New order » to begin.",
    invoiced_label:"Invoiced", remaining_label:"Remaining", collected_label:"Collected",
    late_delivery:"{n} late delivery{s}", overdue_pay:"{n} payment{s} to watch",
    kpi_total_po:"Total PO", kpi_invoiced:"Invoiced", kpi_collected:"Collected",
    kpi_overdue_client:"Overdue invoices", kpi_outstanding_client:"Outstanding (not due)",
    kpi_open:"Open orders", commanded:"Ordered", late_label:"Invoiced, unpaid",
    outstanding_wait:"Pending invoices", remain_invoice:"Remaining to invoice",
    // Tabs
    tab_orders:"Orders", tab_invoices:"Invoices", tab_payments:"Payments",
    search_orders:"Search PO #, SO, status…",
    search_invoices:"Search invoice #, PO…",
    search_payments:"Search payment ref, method…",
    results:"{n} result{s}", no_results:"No {type} found",
    show_more:"Show {n} more {type}", collapse:"Collapse",
    // Orders
    btn_new_order:"New order", btn_add_invoice:"Add invoice",
    col_po:"PO #", col_so:"SO #", col_order_num:"Order #", col_date:"Date",
    col_amount:"PO Amount", col_invoiced_remain:"Invoiced / Remaining", col_collected:"Collected",
    col_delivery_mode:"Delivery mode", col_expected:"Expected date",
    col_nb_invoices:"Invoices", col_notes:"Notes",
    delay_days:"{n}d late", in_days:"In {n}d",
    invoice_section:"Shipments & Invoices", no_invoice_yet:"No invoice for this order",
    // Invoices
    col_invoice:"Invoice #", col_due:"Due date", col_paid:"Paid",
    col_remain:"Remaining", col_status:"Status", col_actions:"Actions",
    payments_received:"Payments received", total_paid:"Total paid",
    remaining_due:"Remaining", fully_settled:"✓ Fully settled",
    // Payments
    col_method:"Method", col_ref:"Reference",
    total_shown:"Shown total", payments_total:"payment{s}",
    global_total:"Global total",
    // Modals
    new_client:"New client", edit_client_title:"Edit client",
    client_name:"Customer name *", account_num:"Account #",
    pay_terms:"Payment terms", custom_days:"Days",
    uppercase_note:"Name will be automatically uppercased.",
    auto_due:"Automatic due dates:", due_advance:"Payment tied to delivery.",
    due_immediate:"Cash payment — due on invoice date.",
    due_days:"Auto-calculated ({n} days after invoice date).",
    create_client:"Create client", save_changes:"Save changes",
    new_order:"New order", edit_order:"Edit order",
    order_date:"Order date *", po_number:"Customer PO # *",
    so_number:"SO # *", order_number_cimelec:"Order # (CIMELEC)",
    amount:"Amount (€) *", delivery_mode:"Delivery mode",
    expected_date:"Expected delivery date", order_notes:"Notes",
    order_status_title:"Order status *",
    create_order:"Create order", save_order:"Save",
    new_invoice:"New shipment / Invoice", edit_invoice:"Edit invoice",
    invoice_number:"Invoice # *", invoice_date:"Invoice date *",
    invoice_amount:"Amount (€) *", shipping_mode:"Shipping mode",
    due_date_field:"Payment due date", force_manual:"Set manually",
    calculated:"Calculated", already_invoiced:"Already invoiced", po_remain:"Remaining",
    invoice_notes:"Notes", create_invoice:"Create invoice", save_invoice:"Save",
    record_payment:"Record a payment", edit_payment:"Edit payment",
    pay_date:"Payment date *", pay_amount:"Amount received (€) *",
    pay_method:"Payment method", pay_ref:"Reference / Wire #",
    pay_notes:"Notes…", validate_payment:"Confirm payment",
    already_paid:"Already paid", remain_to_pay:"Remaining",
    // Reports
    report_title:"Generate PDF report", report_sub:"Select type and period",
    report_generate:"Generate & Print",
    r_open:"Open Orders", r_open_desc:"Orders not fully invoiced",
    r_overdue:"Overdue invoices", r_overdue_desc:"Due date passed, unpaid balance",
    r_upcoming:"Upcoming due dates", r_upcoming_desc:"Invoices due in the next 30 days",
    r_unpaid:"Outstanding invoices", r_unpaid_desc:"All invoices with remaining balance",
    r_all:"All invoices", r_all_desc:"Complete listing for the period",
    r_summary:"Customer summary", r_summary_desc:"Summary by client",
    date_from:"Start date", date_to:"End date",
    clients_included:"Customers included", all_clients:"All", no_clients:"None",
    // Alerts ticker
    alert_label:"ALERT",
    a_overdue:"{n} overdue invoice{s}", a_overdue_detail:"{amt} € to recover",
    a_fact_non_exp:"{n} order{s} invoiced but not shipped",
    a_soon:"{n} due date{s} in the next 7 days", a_soon_detail:"{amt} € to collect",
    a_fdi:"{n} order{s} awaiting FDI",
    a_late:"{n} late delivery{s}",
    // Status labels
    s_en_cours:"In progress", s_attente_fdi:"Awaiting FDI",
    s_partiel:"Ready (partial)", s_prete:"Ready (complete)",
    s_expediee:"Shipped", s_exp_fact:"Shipped + Invoiced",
    s_fact_non_exp:"Invoiced, not shipped", s_livree:"Delivered",
    s_livree_part:"Delivered (partial)", s_annule:"Cancelled",
    // Search
    search_placeholder:"Search PO #, SO, invoice, reference…",
    search_hint:"Type at least 2 characters to search",
    search_empty:"No results for « {q} »",
    type_order:"Order", type_invoice:"Invoice", type_payment:"Payment",
    click_to_open:"Click to open and edit",
    // Pay status
    ps_paid:"✓ Settled", ps_partial_en_cours:"Partial · in progress", ps_en_cours:"In progress",
    ps_today:"Due today", ps_soon_part:"In {n}d · partial",
    ps_soon:"Due in {n}d", ps_ov_part:"Overdue {n}d · partial",
    ps_overdue:"Overdue {n} day{s}", ps_due:"In progress — due {date}",
    // Tags
    tag_retard:"⏰ LATE DELIVERY", tag_solde:"✓ SETTLED", tag_echue:"⚠ {n} OVERDUE · {amt} €",
    tag_proche:"🔔 {n} DUE SOON", tag_encaisse:"{n}% COLLECTED",
  },
};
// Helper: get translation
const t=(lang:Lang,key:string,vars?:Record<string,any>)=>{
  let s=T[lang][key]||T["fr"][key]||key;
  if(vars)Object.keys(vars).forEach(k=>{s=s.replaceAll("{"+k+"}",String(vars[k]));});
  return s;
};

// ─── CONSTANTS ──────────────────────────────────────────────────────────────
const DEFAULT_CLIENTS = ["BERNABE","CIMELEC","SA INDUSTRIE","SAPE","CEDEX","VINCI","SEG","EPA","MCT"];
// Statuts avec métadonnées (icon, couleur, alerte, position dans le flux)
const ORDER_STATUSES = [
  {id:"en_cours",      label:"En cours",                  icon:"ti-clock",             step:1, alert:false, desc:"Commande en cours de traitement"},
  {id:"attente_fdi",   label:"En attente FDI",            icon:"ti-file-alert",        step:2, alert:true,  desc:"En attente de Fonds/Documents d'Importation"},
  {id:"partiel",       label:"Prête (partielle)",          icon:"ti-package",           step:3, alert:false, desc:"Marchandise partiellement disponible"},
  {id:"prete",         label:"Prête (complète)",           icon:"ti-package-export",    step:4, alert:false, desc:"Marchandise entièrement disponible, prête à expédier"},
  {id:"expediee",      label:"Expédiée",                   icon:"ti-truck",             step:5, alert:false, desc:"En cours d'acheminement"},
  {id:"exp_fact",      label:"Expédiée + Facturée",        icon:"ti-circle-check",      step:6, alert:false, desc:"Expédiée et facturée — en attente de livraison"},
  {id:"fact_non_exp",  label:"Facturée non expédiée",      icon:"ti-alert-circle",      step:5, alert:true,  desc:"⚠ Facture émise mais marchandise non encore expédiée"},
  {id:"livree",        label:"Livrée",                     icon:"ti-checks",            step:7, alert:false, desc:"Livraison confirmée chez le client"},
  {id:"livree_part",   label:"Livrée (partielle)",          icon:"ti-check",             step:7, alert:false, desc:"Livraison partielle — reliquat en attente"},
  {id:"annule",        label:"Annulée",                     icon:"ti-x",                 step:0, alert:false, desc:"Commande annulée"},
];
const STATUSES = ORDER_STATUSES.map(s=>s.id);
const DELIVERY_MODES  = ["Transitaire FCA","Air","PL","Air Abidjan","Maritime","Express"];
const PAY_METHODS     = ["Virement bancaire","Chèque","Traite","Espèces","Autre"];
const MONTHS          = ["JAN","FÉV","MAR","AVR","MAI","JUN","JUL","AOÛ","SEP","OCT","NOV","DÉC"];
const KEY             = "order_mgmt_v4";

const PAY_TERMS = [
  {id:"comptant",  label:"Comptant / Immédiat",           days:0,   advance:false},
  {id:"av3070",    label:"30% commande + 70% livraison",  days:0,   advance:true },
  {id:"av5050",    label:"50% commande + 50% livraison",  days:0,   advance:true },
  {id:"av6040",    label:"60% commande + 40% livraison",  days:0,   advance:true },
  {id:"net30",     label:"30 jours net",                  days:30,  advance:false},
  {id:"net45",     label:"45 jours net",                  days:45,  advance:false},
  {id:"net60",     label:"60 jours net",                  days:60,  advance:false},
  {id:"net90",     label:"90 jours net",                  days:90,  advance:false},
  {id:"3m10j",     label:"3 mois + 10 jours",             days:100, advance:false},
  {id:"custom",    label:"Personnalisé (saisir jours)",   days:0,   advance:false},
];

// ─── DESIGN TOKENS ──────────────────────────────────────────────────────────
const C = {
  page:"#F0F4F8", card:"#FFFFFF", side:"#111827",
  b:"#E5EAF0", bHov:"#CBD5E1",
  t1:"#0D1B2A", t2:"#4A5568", t3:"#8FA0B3",
  blue:"#2563EB",  blueL:"#DBEAFE",  blueDk:"#1D4ED8",
  green:"#059669", greenL:"#D1FAE5", greenDk:"#047857",
  amber:"#D97706", amberL:"#FEF3C7", amberDk:"#B45309",
  red:"#DC2626",   redL:"#FEE2E2",   redDk:"#B91C1C",
  purple:"#7C3AED",purpleL:"#EDE9FE",
  teal:"#0D9488",  tealL:"#CCFBF1",
  sh:"0 1px 3px rgba(0,0,0,.07),0 1px 2px rgba(0,0,0,.04)",
  shMd:"0 4px 12px rgba(0,0,0,.08),0 2px 4px rgba(0,0,0,.04)",
  r:"10px", rSm:"6px", rLg:"14px",
};

// ─── UTILITIES ──────────────────────────────────────────────────────────────
const fmt   = (n:any)=>new Intl.NumberFormat("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2}).format(n||0);
const fmtK  = (n:any)=>{const v=Math.abs(n||0);if(v>=1000000)return (n/1000000).toFixed(2)+"M";if(v>=1000)return(n/1000).toFixed(1)+"K";return fmt(n);};
const fmtD  = (d:any)=>d?new Date(d+"T00:00:00").toLocaleDateString("fr-FR"):"—";
const todayStr=()=>new Date().toISOString().split("T")[0];
const addDays=(s:string,d:number)=>{const dt=new Date(s+"T00:00:00");dt.setDate(dt.getDate()+d);return dt.toISOString().split("T")[0];};
const diffD =(s:string)=>{const dt=new Date(s+"T00:00:00"),t=new Date();t.setHours(0,0,0,0);return Math.ceil((dt.getTime()-t.getTime())/86400000);};

const calcDueDate=(invDate:string,termId:string,customDays:number)=>{
  if(!invDate)return"";
  const term=PAY_TERMS.find(t=>t.id===termId);
  if(!term||term.advance)return invDate;
  return addDays(invDate,termId==="custom"?customDays:(term.days||0));
};

const payStatus=(inv:any)=>{
  const paid=(inv.payments||[]).reduce((s:number,p:any)=>s+(+p.amount||0),0);
  const total=+inv.amount||0;
  const rem=Math.max(0,total-paid);
  if(paid>=total*0.999)return{key:"paid",label:"✓ Soldé",color:C.green,bg:C.greenL,paid,rem:0};
  const due=inv.dueDate;
  if(!due){
    // No due date configured
    if(paid>0)return{key:"partial",label:"En cours · partiel",color:C.amber,bg:C.amberL,paid,rem};
    return{key:"pending",label:"En cours",color:C.blue,bg:C.blueL,paid,rem};
  }
  const d=diffD(due);
  if(d<0){
    // Past due date = ÉCHU
    const abs=Math.abs(d);
    if(paid>0)return{key:"ov_part",label:`Échu ${abs}j · partiel`,color:C.red,bg:C.redL,paid,rem};
    return{key:"overdue",label:`Échu depuis ${abs} jour${abs>1?"s":""}`,color:C.red,bg:C.redL,paid,rem};
  }
  if(d===0)return{key:"today",label:"Échéance aujourd'hui",color:C.amber,bg:C.amberL,paid,rem};
  if(d<=7){
    // Due soon but not yet overdue
    if(paid>0)return{key:"soon_part",label:`Dans ${d}j · partiel`,color:C.amber,bg:C.amberL,paid,rem};
    return{key:"soon",label:`Échéance dans ${d}j`,color:C.amber,bg:C.amberL,paid,rem};
  }
  // Future due date = EN COURS (not yet due)
  if(paid>0)return{key:"partial",label:"En cours · partiel",color:C.amber,bg:C.amberL,paid,rem};
  return{key:"ok",label:`En cours — éch. ${fmtD(due)}`,color:C.blue,bg:C.blueL,paid,rem};
};

// Status style lookup by id
const SS:Record<string,any>={
  "en_cours":     {c:C.amber,bg:C.amberL,alert:false},
  "attente_fdi":  {c:"#9333EA",bg:"#F3E8FF",alert:true},
  "partiel":      {c:C.amberDk,bg:C.amberL,alert:false},
  "prete":        {c:"#0369A1",bg:"#E0F2FE",alert:false},
  "expediee":     {c:C.teal,bg:C.tealL,alert:false},
  "exp_fact":     {c:C.greenDk,bg:C.greenL,alert:false},
  "fact_non_exp": {c:C.redDk,bg:C.redL,alert:true},
  "livree":       {c:"#065F46",bg:"#ECFDF5",alert:false},
  "livree_part":  {c:"#0D9488",bg:"#CCFBF1",alert:false},
  "annule":       {c:C.t3,bg:"#F1F5F9",alert:false},
};
const getStatusMeta=(id:string,lang:Lang="fr")=>{
  const base=ORDER_STATUSES.find(s=>s.id===id)||{id,label:id,icon:"ti-circle",step:0,alert:false,desc:""};
  const labelKey=("s_"+id) as string;
  const label=T[lang][labelKey]||base.label;
  return{...base,label};
};

// ─── APP ────────────────────────────────────────────────────────────────────
// ─── AUTH ─────────────────────────────────────────────────────────────────────
const DEFAULT_ADMIN_PIN="1234";
const AUTH_KEY="ordertrack_auth";
const USERS_DB_KEY="ordertrack-users";

function LoginScreen({onLogin}:any){
  const[pin,setPin]=useState("");
  const[error,setError]=useState("");
  const[loading,setLoading]=useState(false);
  const inputRef=useRef<HTMLInputElement>(null);
  useEffect(()=>{setTimeout(()=>inputRef.current?.focus(),100);},[]);

  const tryLogin=async()=>{
    if(!pin){setError("Entrez votre code d'accès");return;}
    setLoading(true);setError("");
    // Check against Supabase users
    try{
      const K="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4eHJ4bnl4Zm1nY2R6eGNpZ2R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMTg5MzIsImV4cCI6MjA5NTc5NDkzMn0.wF2mt8BK1KGk-VyK4zZQvFGJCxCp8UGDPdgT_8DHc6o";
      const B="https://vxxrxnyxfmgcdzxcigdw.supabase.co";
      const res=await fetch(B+"/rest/v1/ordertrack_data?apikey="+K+"&user_key=eq."+USERS_DB_KEY+"&select=payload&limit=1",
        {headers:{"apikey":K,"Authorization":"Bearer "+K,"Prefer":"return=representation"}});
      const rows=res.ok?await res.json():null;
      const users:any[]=rows?.[0]?.payload?.users||[{name:"Admin",pin:DEFAULT_ADMIN_PIN,role:"admin"}];
      const found=users.find((u:any)=>u.pin===pin);
      if(found){
        const session={name:found.name,role:found.role,pin:found.pin,loginAt:new Date().toISOString()};
        localStorage.setItem(AUTH_KEY,JSON.stringify(session));
        onLogin(session);
      } else {
        setError("Code incorrect. Vérifiez votre code d'accès.");
        setPin("");
      }
    }catch{
      // Offline fallback: check if admin pin
      if(pin===DEFAULT_ADMIN_PIN||pin==="1234"){
        const session={name:"Admin",role:"admin",pin,loginAt:new Date().toISOString()};
        localStorage.setItem(AUTH_KEY,JSON.stringify(session));
        onLogin(session);
      } else {
        setError("Connexion impossible. Vérifiez votre réseau.");
      }
    }
    setLoading(false);
  };

  return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"linear-gradient(135deg,#0D1B2A 0%,#1E3A5F 60%,#1D4ED8 100%)"}}>
      <div style={{background:"#fff",borderRadius:16,padding:"40px 48px",width:360,maxWidth:"90vw",boxShadow:"0 20px 60px rgba(0,0,0,.4)",textAlign:"center"}}>
        <div style={{width:56,height:56,borderRadius:14,background:"linear-gradient(135deg,#3B82F6,#8B5CF6)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px"}}>
          <i className="ti ti-box" style={{fontSize:28,color:"#fff"}} aria-hidden="true"/>
        </div>
        <h1 style={{margin:"0 0 4px",fontSize:22,fontWeight:800,color:"#0D1B2A"}}>OrderTrack</h1>
        <p style={{margin:"0 0 28px",color:"#8FA0B3",fontSize:13}}>Accès sécurisé — Entrez votre code</p>
        <input ref={inputRef} type="password" value={pin} onChange={e=>setPin(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&tryLogin()}
          placeholder="Code d'accès"
          style={{width:"100%",padding:"12px 16px",border:`2px solid ${error?"#DC2626":"#E5EAF0"}`,borderRadius:10,fontSize:16,textAlign:"center",letterSpacing:"0.3em",outline:"none",boxSizing:"border-box",fontFamily:"inherit",marginBottom:12}}/>
        {error&&<div style={{color:"#DC2626",fontSize:12,marginBottom:12,fontWeight:500}}>{error}</div>}
        <button onClick={tryLogin} disabled={loading}
          style={{width:"100%",padding:"12px",background:"linear-gradient(135deg,#2563EB,#7C3AED)",color:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:loading?"not-allowed":"pointer",opacity:loading?.7:1}}>
          {loading?"Vérification…":"Accéder →"}
        </button>
      </div>
    </div>
  );
}

const DEFAULT_PERMS={canEdit:true,canDelete:true,canAddCustomer:true,canViewReports:true,canExport:true};

function UserManager({session,onClose}:any){
  const[users,setUsers]=useState<any[]>([]);
  const[newName,setNewName]=useState("");
  const[newPin,setNewPin]=useState("");
  const[newRole,setNewRole]=useState("user");
  const[msg,setMsg]=useState("");
  const[editIdx,setEditIdx]=useState<number|null>(null);
  const[editName,setEditName]=useState("");
  const[editPin,setEditPin]=useState("");
  const[editShowPin,setEditShowPin]=useState(false);
  const[expandPerms,setExpandPerms]=useState<number|null>(null);
  const K="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4eHJ4bnl4Zm1nY2R6eGNpZ2R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMTg5MzIsImV4cCI6MjA5NTc5NDkzMn0.wF2mt8BK1KGk-VyK4zZQvFGJCxCp8UGDPdgT_8DHc6o";
  const B="https://vxxrxnyxfmgcdzxcigdw.supabase.co";

  useEffect(()=>{loadUsers();},[]);
  const loadUsers=async()=>{
    try{
      const res=await fetch(B+"/rest/v1/ordertrack_data?apikey="+K+"&user_key=eq."+USERS_DB_KEY+"&select=payload&limit=1",
        {headers:{"apikey":K,"Authorization":"Bearer "+K,"Prefer":"return=representation"}});
      const rows=res.ok?await res.json():null;
      setUsers(rows?.[0]?.payload?.users||[{name:"Admin",pin:"1234",role:"admin",perms:DEFAULT_PERMS}]);
    }catch{setUsers([{name:"Admin",pin:"1234",role:"admin",perms:DEFAULT_PERMS}]);}
  };
  const saveUsers=async(updated:any[])=>{
    try{
      // Always use upsert (merge-duplicates) — PATCH returns 204 even for 0 rows matched
      const r=await fetch(B+"/rest/v1/ordertrack_data?apikey="+K,{
        method:"POST",
        headers:{"Content-Type":"application/json","apikey":K,"Authorization":"Bearer "+K,"Prefer":"resolution=merge-duplicates,return=minimal"},
        body:JSON.stringify({user_key:USERS_DB_KEY,payload:{users:updated}})
      });
      if(!r.ok){const e=await r.text();console.warn("[saveUsers]",r.status,e);}
      setUsers(updated);setMsg("✓ Sauvegardé");setTimeout(()=>setMsg(""),2000);
    }catch{setMsg("Erreur de sauvegarde");}
  };
  const addUser=()=>{
    if(!newName||!newPin){setMsg("Nom et code requis");return;}
    if(newPin.length<4){setMsg("Le code doit avoir au moins 4 caractères");return;}
    if(users.find((u:any)=>u.pin===newPin)){setMsg("Ce code est déjà utilisé");return;}
    const updated=[...users,{name:newName,pin:newPin,role:newRole,perms:{...DEFAULT_PERMS}}];
    saveUsers(updated);setNewName("");setNewPin("");
  };
  const delUser=(idx:number)=>{
    if(!window.confirm("Supprimer cet utilisateur ?"))return;
    saveUsers(users.filter((_:any,i:number)=>i!==idx));
  };
  const startEdit=(idx:number)=>{
    setEditIdx(idx);setEditName(users[idx].name);setEditPin("");setEditShowPin(false);
  };
  const saveEdit=()=>{
    if(!editName){setMsg("Nom requis");return;}
    if(editPin&&editPin.length<4){setMsg("Le code doit avoir au moins 4 caractères");return;}
    if(editPin&&editIdx!==null&&users.find((u:any,i:number)=>i!==editIdx&&u.pin===editPin)){setMsg("Ce code est déjà utilisé");return;}
    const updated=users.map((u:any,i:number)=>i===editIdx?{...u,name:editName,...(editPin?{pin:editPin}:{})}:u);
    saveUsers(updated);setEditIdx(null);
  };
  const togglePerm=(idx:number,perm:string,val:boolean)=>{
    const updated=users.map((u:any,i:number)=>i===idx?{...u,perms:{...(u.perms||DEFAULT_PERMS),[perm]:val}}:u);
    saveUsers(updated);
  };
  const PERMS_LIST=[
    {key:"canEdit",label:"Modifier les commandes / factures",icon:"ti-edit"},
    {key:"canDelete",label:"Supprimer des données",icon:"ti-trash"},
    {key:"canAddCustomer",label:"Ajouter / supprimer des clients",icon:"ti-user-plus"},
    {key:"canViewReports",label:"Accès aux rapports hebdo",icon:"ti-file-report"},
    {key:"canExport",label:"Exporter en PDF",icon:"ti-file-export"},
  ];
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,backdropFilter:"blur(3px)"}}>
      <div style={{background:"#fff",borderRadius:16,width:560,maxWidth:"96vw",maxHeight:"92vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,.3)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 22px",borderBottom:`1px solid #E5EAF0`}}>
          <h3 style={{margin:0,fontSize:16,fontWeight:700,color:"#0D1B2A",display:"flex",alignItems:"center",gap:8}}>
            <i className="ti ti-users" style={{fontSize:18,color:"#2563EB"}} aria-hidden="true"/> Gestion des accès
          </h3>
          <button onClick={onClose} style={{background:"#F1F5F9",border:"none",color:"#8FA0B3",cursor:"pointer",borderRadius:6,width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <i className="ti ti-x" style={{fontSize:15}} aria-hidden="true"/>
          </button>
        </div>
        <div style={{overflowY:"auto",flex:1,padding:"16px 22px"}}>
          {msg&&<div style={{background:msg.startsWith("✓")?"#D1FAE5":"#FEE2E2",color:msg.startsWith("✓")?"#065F46":"#B91C1C",padding:"8px 12px",borderRadius:6,marginBottom:12,fontSize:12,fontWeight:600}}>{msg}</div>}
          <div style={{marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:600,color:"#0D1B2A",marginBottom:8}}>Ajouter un utilisateur</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 120px 100px",gap:8,marginBottom:8}}>
              <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Nom" style={{padding:"8px 10px",border:"1px solid #E5EAF0",borderRadius:6,fontSize:12,fontFamily:"inherit"}}/>
              <input value={newPin} onChange={e=>setNewPin(e.target.value)} placeholder="Code PIN" type="password" style={{padding:"8px 10px",border:"1px solid #E5EAF0",borderRadius:6,fontSize:12,fontFamily:"inherit"}}/>
              <select value={newRole} onChange={e=>setNewRole(e.target.value)} style={{padding:"8px 10px",border:"1px solid #E5EAF0",borderRadius:6,fontSize:12}}>
                <option value="user">Utilisateur</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button onClick={addUser} style={{background:"#2563EB",color:"#fff",border:"none",borderRadius:6,padding:"8px 16px",fontSize:12,fontWeight:600,cursor:"pointer"}}>
              + Ajouter
            </button>
          </div>
          <div style={{fontSize:12,fontWeight:600,color:"#0D1B2A",marginBottom:8}}>Utilisateurs ({users.length})</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {users.map((u:any,i:number)=>(
              <div key={i} style={{background:"#F8FAFC",borderRadius:8,border:"1px solid #E5EAF0",overflow:"hidden"}}>
                {/* User row */}
                <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px"}}>
                  <div style={{width:36,height:36,borderRadius:8,background:u.role==="admin"?"#DBEAFE":"#F3E8FF",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <i className={`ti ${u.role==="admin"?"ti-shield-check":"ti-user"}`} style={{fontSize:16,color:u.role==="admin"?"#2563EB":"#7C3AED"}} aria-hidden="true"/>
                  </div>
                  {editIdx===i?(
                    <div style={{flex:1,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                      <input value={editName} onChange={e=>setEditName(e.target.value)} placeholder="Nom"
                        style={{padding:"5px 8px",border:"1px solid #93C5FD",borderRadius:5,fontSize:12,fontFamily:"inherit",flex:1,minWidth:80}}/>
                      <div style={{display:"flex",alignItems:"center",gap:4}}>
                        <input value={editPin} onChange={e=>setEditPin(e.target.value)}
                          type={editShowPin?"text":"password"} placeholder="Nouveau code (optionnel)"
                          style={{padding:"5px 8px",border:"1px solid #93C5FD",borderRadius:5,fontSize:12,fontFamily:"inherit",width:140}}/>
                        <button onClick={()=>setEditShowPin(!editShowPin)} style={{background:"transparent",border:"none",cursor:"pointer",color:"#8FA0B3",padding:2}}>
                          <i className={`ti ${editShowPin?"ti-eye-off":"ti-eye"}`} style={{fontSize:13}} aria-hidden="true"/>
                        </button>
                      </div>
                      <button onClick={saveEdit} style={{background:"#2563EB",color:"#fff",border:"none",borderRadius:5,padding:"5px 10px",fontSize:11,fontWeight:600,cursor:"pointer"}}>✓</button>
                      <button onClick={()=>setEditIdx(null)} style={{background:"#F1F5F9",color:"#6B7280",border:"none",borderRadius:5,padding:"5px 10px",fontSize:11,cursor:"pointer"}}>✕</button>
                    </div>
                  ):(
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:600,fontSize:13,color:"#0D1B2A"}}>{u.name}</div>
                      <div style={{fontSize:11,color:"#8FA0B3"}}>
                        {u.role==="admin"?"Administrateur":"Utilisateur"} · Code : {"•".repeat(u.pin?.length||4)}
                      </div>
                    </div>
                  )}
                  <div style={{display:"flex",gap:4,flexShrink:0}}>
                    {u.role!=="admin"&&<button onClick={()=>setExpandPerms(expandPerms===i?null:i)} title="Permissions"
                      style={{background:expandPerms===i?"#EDE9FE":"#F3E8FF",color:"#7C3AED",border:"none",borderRadius:5,width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                      <i className="ti ti-lock" style={{fontSize:13}} aria-hidden="true"/>
                    </button>}
                    <button onClick={()=>editIdx===i?setEditIdx(null):startEdit(i)} title="Modifier"
                      style={{background:"#DBEAFE",color:"#2563EB",border:"none",borderRadius:5,width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                      <i className="ti ti-edit" style={{fontSize:13}} aria-hidden="true"/>
                    </button>
                    {i>0&&<button onClick={()=>delUser(i)} title="Supprimer"
                      style={{background:"#FEE2E2",color:"#DC2626",border:"none",borderRadius:5,width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                      <i className="ti ti-trash" style={{fontSize:13}} aria-hidden="true"/>
                    </button>}
                  </div>
                </div>
                {/* Permissions panel */}
                {expandPerms===i&&u.role!=="admin"&&(
                  <div style={{padding:"10px 14px",borderTop:"1px solid #E5EAF0",background:"#fff"}}>
                    <div style={{fontSize:11,fontWeight:600,color:"#7C3AED",marginBottom:8,display:"flex",alignItems:"center",gap:5}}>
                      <i className="ti ti-lock" style={{fontSize:12}} aria-hidden="true"/> Permissions de {u.name}
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      {PERMS_LIST.map(({key,label,icon})=>{
                        const val=(u.perms||DEFAULT_PERMS)[key]!==false;
                        return(
                          <label key={key} style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",padding:"4px 0"}}>
                            <div onClick={()=>togglePerm(i,key,!val)}
                              style={{width:36,height:20,borderRadius:10,background:val?"#7C3AED":"#D1D5DB",transition:"all .2s",position:"relative",flexShrink:0,cursor:"pointer"}}>
                              <div style={{width:16,height:16,borderRadius:8,background:"#fff",position:"absolute",top:2,left:val?18:2,transition:"all .2s",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
                            </div>
                            <i className={`ti ${icon}`} style={{fontSize:13,color:val?"#7C3AED":"#9CA3AF"}} aria-hidden="true"/>
                            <span style={{fontSize:11,color:val?"#0D1B2A":"#9CA3AF",fontWeight:val?500:400}}>{label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App(){
  const[page,setPage]=useState("kpi");
  const[isMobile,setIsMobile]=useState(window.innerWidth<768);
  useEffect(()=>{
    const fn=()=>setIsMobile(window.innerWidth<768);
    window.addEventListener("resize",fn);
    return()=>window.removeEventListener("resize",fn);
  },[]);
  const[data,setData]=useState<any>(null);
  const[clients,setCustomers]=useState<string[]|null>(null);
  const[session,setSession]=useState<any>(()=>{
    try{const s=localStorage.getItem(AUTH_KEY);return s?JSON.parse(s):null;}catch{return null;}
  });
  const[showUserMgr,setShowUserMgr]=useState(false);
  const logout=()=>{localStorage.removeItem(AUTH_KEY);setSession(null);};
  const[configs,setConfigs]=useState<Record<string,any>>({});
  const[modal,setModal]=useState<any>(null);
  const[sideOpen,setSideOpen]=useState(true);
  const[mobileMenuOpen,setMobileMenuOpen]=useState(false);
  const[selYear,setSelYear]=useState<number>(new Date().getFullYear());
  const[showSearch,setShowSearch]=useState(false);
  const[lang,setLang]=useState<Lang>("fr");
  const[syncStatus,setSyncStatus]=useState<"idle"|"syncing"|"ok"|"offline"|"error">("idle");
  const[lastSync,setLastSync]=useState<string|null>(null);
  const[focusOrderId,setFocusOrderId]=useState<string|null>(null);

  // ── Offline detection ────────────────────────────────────────────────────
  const[isOnline,setIsOnline]=useState(navigator.onLine);
  useEffect(()=>{
    const goOn=()=>setIsOnline(true);
    const goOff=()=>setIsOnline(false);
    window.addEventListener("online",goOn);
    window.addEventListener("offline",goOff);
    return()=>{window.removeEventListener("online",goOn);window.removeEventListener("offline",goOff);};
  },[]);

  // ── Session expiration (30 min) ──────────────────────────────────────────
  const timerRef=useRef<any>(null);
  const resetSessionTimer=React.useCallback(()=>{
    if(timerRef.current)clearTimeout(timerRef.current);
    timerRef.current=setTimeout(()=>{
      alert("Votre session a expiré après 30 minutes d'inactivité.");
      localStorage.removeItem(AUTH_KEY);
      setSession(null);
    },30*60*1000);
  },[]);
  useEffect(()=>{
    if(!session)return;
    const events=["mousedown","keydown","touchstart","scroll"];
    events.forEach(ev=>window.addEventListener(ev,resetSessionTimer,{passive:true}));
    resetSessionTimer();
    return()=>{
      events.forEach(ev=>window.removeEventListener(ev,resetSessionTimer));
      if(timerRef.current)clearTimeout(timerRef.current);
    };
  },[session,resetSessionTimer]);

  useEffect(()=>{
    (async()=>{
      setSyncStatus("syncing");
      // 1. Try cloud first — compare timestamps
      try {
        const result = await cloudLoad();
        if(result?.payload){
          const cloud=result.payload;
          const cloudTs=result.updatedAt||"";
          const localTs=localStorage.getItem(KEY+"_ts")||"";
          const localStr=localStorage.getItem(KEY);
          const localParsed=localStr?JSON.parse(localStr):null;
          // Use local if it's newer than cloud (user made changes offline)
          const localIsNewer=localTs&&cloudTs&&(new Date(localTs)>new Date(cloudTs));
          const localHasData=localParsed?.orders&&Object.values(localParsed.orders).some((arr:any)=>arr?.length>0);
          const cloudHasData=cloud.orders&&Object.values(cloud.orders).some((arr:any)=>arr?.length>0);
          if(localIsNewer && localHasData){
            // Local is newer — load local and push to cloud
            setCustomers(localParsed.clients||DEFAULT_CLIENTS);
            setData(migrateRDT(localParsed.orders||{}));
            setConfigs(localParsed.configs||{});
            setSyncStatus("syncing");
            cloudSave(localParsed).then(ok=>{
              setSyncStatus(ok?"ok":"offline");
              if(ok)setLastSync(new Date().toLocaleTimeString("fr-FR"));
            });
            return;
          }
          if(cloudHasData||!localHasData){
            // Cloud is newer or local is empty — use cloud
            setCustomers(cloud.clients||DEFAULT_CLIENTS);
            setData(migrateRDT(cloud.orders||{}));
            setConfigs(cloud.configs||migrateAccounts(cloud.accounts));
            try{
              localStorage.setItem(KEY,JSON.stringify(cloud));
              localStorage.setItem(KEY+"_ts",cloudTs);
            }catch{}
            lastCloudUpdate.current=new Date(cloudTs).toISOString();
            setSyncStatus("ok");
            setLastSync(new Date().toLocaleTimeString("fr-FR"));
            return;
          }
        }
      } catch { /* offline or table not ready */ }
      // 2. Fallback to localStorage
      try{
        const s=localStorage.getItem(KEY);
        if(s){
          const p=JSON.parse(s);
          setCustomers(p.clients||DEFAULT_CLIENTS);
          setData(migrateRDT(p.orders||{}));
          setConfigs(p.configs||migrateAccounts(p.accounts));
          setSyncStatus("offline");
          return;
        }
      }catch{}
      // 3. Fresh start
      const init:any={};DEFAULT_CLIENTS.forEach(c=>(init[c]=[]));
      setCustomers(DEFAULT_CLIENTS);setData(init);
      setSyncStatus("idle");
    })();
  },[]);

  const migrateStatus=(s:string)=>{
    const map:Record<string,string>={
      "En cours":"en_cours","Expédié":"expediee","Livré":"livree",
      "Facturé":"exp_fact","Annulé":"annule","PL":"prete","Prêt":"prete",
      "OC":"prete","Transitaire FCA":"expediee","Air Abidjan":"expediee","RDT":"expediee"
    };
    return map[s]||s;
  };
  const migrateRDT=(orders:any)=>{
    const mv=(v:string)=>v==="RDT"?"Transitaire FCA":v;
    const ms=(v:string)=>migrateStatus(v);
    const res:any={};
    Object.keys(orders).forEach(c=>{res[c]=(orders[c]||[]).map((o:any)=>({...o,status:ms(mv(o.status||"")),deliveryMode:mv(o.deliveryMode||""),invoices:(o.invoices||[]).map((i:any)=>({...i,shippingMode:mv(i.shippingMode||"")})) }));});
    return res;
  };
  const migrateAccounts=(acc:any)=>{
    if(!acc)return{};
    const c:any={};
    Object.keys(acc).forEach(k=>{c[k]={accountNumber:acc[k],termId:"net60",customDays:0};});
    return c;
  };

  // ── Auto-sync: poll Supabase every 15s using updated_at timestamp ───────────
  const lastCloudUpdate=React.useRef<string>("");
  const [updateAlert,setUpdateAlert]=useState<string|null>(null);
  useEffect(()=>{
    const interval=setInterval(async()=>{
      try{
        const result=await cloudLoad();
        if(!result?.payload||!result.updatedAt)return;
        if(result.updatedAt&&lastCloudUpdate.current&&new Date(result.updatedAt)<=new Date(lastCloudUpdate.current))return;
        // New data detected from another device!
        const isFirstLoad=!lastCloudUpdate.current;
        lastCloudUpdate.current=new Date(result.updatedAt).toISOString();
        const cloud=result.payload;
        if(!cloud.orders)return;
        setCustomers(c=>JSON.stringify(c)===JSON.stringify(cloud.clients)?c:(cloud.clients||DEFAULT_CLIENTS));
        setData(migrateRDT(cloud.orders||{}));
        setConfigs(cloud.configs||{});
        localStorage.setItem(KEY,JSON.stringify(cloud));
        setSyncStatus("ok");
        setLastSync(new Date().toLocaleTimeString("fr-FR"));
        // Show update alert (not on first load)
        if(!isFirstLoad){
          const t=new Date(result.updatedAt).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
          setUpdateAlert(`🔄 Nouvelles données disponibles — mises à jour à ${t}`);
          setTimeout(()=>setUpdateAlert(null),8000);
        }
      }catch(e){console.warn("[Poll]",e);}
    },15000);
    return()=>clearInterval(interval);
  },[]);

  const persist=(nc:any,nd:any,nf:any)=>{
    const c=nc??clients,d=nd??data,f=nf??configs;
    setCustomers(c);setData(d);setConfigs(f);
    const ts=new Date().toISOString();
    const payload={clients:c,orders:d,configs:f};
    // Local save — instant with timestamp
    try{
      localStorage.setItem(KEY,JSON.stringify(payload));
      localStorage.setItem(KEY+"_ts",ts);
    }catch{}
    // Cloud save with auto-retry (3 attempts)
    setSyncStatus("syncing");
    const trySave=(attempt:number)=>{
      cloudSave(payload).then(ok=>{
        if(ok){
          setSyncStatus("ok");
          setLastSync(new Date().toLocaleTimeString("fr-FR"));
          lastCloudUpdate.current=new Date(ts).toISOString();
        } else if(attempt<3){
          setTimeout(()=>trySave(attempt+1),3000*attempt);
        } else setSyncStatus("offline");
      }).catch(()=>{
        if(attempt<3)setTimeout(()=>trySave(attempt+1),3000*attempt);
        else setSyncStatus("offline");
      });
    };
    trySave(1);
  };

  const getOrders=(c:string)=>data?.[c]||[];
  const getAllOrders=()=>(clients||[]).flatMap(c=>(data?.[c]||[]).map((o:any)=>({...o,_client:c})));

  const getStats=(c:string,yr?:number)=>{
    const y=yr??selYear;
    const orders=getOrders(c);
    // PO counted in year registered · INV in year generated
    const totalPO=orders.reduce((s:number,o:any)=>{const d=o.date?new Date(o.date+"T00:00:00"):null;return(d&&d.getFullYear()===y)?s+(+o.amount||0):s;},0);
    const totalInv=orders.reduce((s:number,o:any)=>s+(o.invoices||[]).reduce((ss:number,i:any)=>{const d=i.date?new Date(i.date+"T00:00:00"):null;return(d&&d.getFullYear()===y)?ss+(+i.amount||0):ss;},0),0);
    const totalPaid=orders.reduce((s:number,o:any)=>s+(o.invoices||[]).reduce((ss:number,i:any)=>ss+(i.payments||[]).reduce((sss:number,p:any)=>sss+(+p.amount||0),0),0),0);
    // Cross-year (financial position — open orders span years)
    const _poAll=orders.reduce((s:number,o:any)=>s+(+o.amount||0),0);
    const _invAll=orders.reduce((s:number,o:any)=>s+(o.invoices||[]).reduce((ss:number,i:any)=>ss+(+i.amount||0),0),0);
    const openOrders=Math.max(0,_poAll-_invAll);
    const unpaidInv=orders.reduce((s:number,o:any)=>s+(o.invoices||[]).reduce((ss:number,i:any)=>{const p=(i.payments||[]).reduce((sss:number,pp:any)=>sss+(+pp.amount||0),0);return ss+Math.max(0,(+i.amount||0)-p);},0),0);
    // Monthly: filtered by selected year
    const monthly=MONTHS.map((_,mi)=>{let po=0,inv=0,paid=0;orders.forEach((o:any)=>{
      const od=o.date?new Date(o.date+"T00:00:00"):null;
      if(od&&od.getMonth()===mi&&od.getFullYear()===y)po+=(+o.amount||0);
      (o.invoices||[]).forEach((i:any)=>{
        const id=i.date?new Date(i.date+"T00:00:00"):null;
        if(id&&id.getMonth()===mi&&id.getFullYear()===y){inv+=(+i.amount||0);paid+=(i.payments||[]).reduce((s:number,p:any)=>s+(+p.amount||0),0);}
      });
    });return{po,inv,paid};});
    return{totalPO,totalInv,totalPaid,openOrders,unpaidInv,monthly};
  };

  // CLIENT CRUD
  const addCustomer=(name:string,cfg:any)=>{const t=name.trim().toUpperCase();if(!t||clients!.includes(t))return false;persist([...clients!,t],{...data,[t]:[]},{...configs,[t]:cfg});return true;};
  const editCustomer=(old:string,name:string,cfg:any)=>{const t=name.trim().toUpperCase();if(!t)return false;if(t!==old&&clients!.includes(t))return false;const nc=clients!.map(c=>c===old?t:c);const nd={...data};nd[t]=nd[old]||[];if(t!==old)delete nd[old];const nf={...configs,[t]:cfg};if(t!==old)delete nf[old];if(page===old)setPage(t);persist(nc,nd,nf);return true;};
  const delCustomer=(name:string)=>{const nc=clients!.filter(c=>c!==name);const nd={...data};delete nd[name];const nf={...configs};delete nf[name];if(page===name)setPage("kpi");persist(nc,nd,nf);};

  // ORDER CRUD
  const saveOrder=(client:string,f:any)=>{const orders=[...getOrders(client)];if(f.id){const i=orders.findIndex((o:any)=>o.id===f.id);if(i>=0)orders[i]={...orders[i],...f};}else orders.push({...f,id:Date.now().toString(),invoices:[]});persist(null,{...data,[client]:orders},null);setModal(null);};
  const delOrder=(client:string,id:string)=>persist(null,{...data,[client]:getOrders(client).filter((o:any)=>o.id!==id)},null);

  // INVOICE CRUD
  const saveInvoice=(client:string,oid:string,f:any)=>{
    const orders=[...getOrders(client)];const idx=orders.findIndex((o:any)=>o.id===oid);if(idx<0)return;
    const invs=[...(orders[idx].invoices||[])];
    // auto-calc dueDate from client config
    const cfg=configs[client]||{};
    const dueDate=f.dueDate||calcDueDate(f.date,cfg.termId||"net60",cfg.customDays||0);
    const inv={...f,dueDate,payments:f.payments||[]};
    if(f.id){const ii=invs.findIndex((i:any)=>i.id===f.id);if(ii>=0)invs[ii]={...invs[ii],...inv};}
    else invs.push({...inv,id:Date.now().toString()});
    orders[idx]={...orders[idx],invoices:invs};
    persist(null,{...data,[client]:orders},null);setModal(null);
  };
  const delInvoice=(client:string,oid:string,iid:string)=>{const orders=[...getOrders(client)];const idx=orders.findIndex((o:any)=>o.id===oid);if(idx<0)return;orders[idx]={...orders[idx],invoices:orders[idx].invoices.filter((i:any)=>i.id!==iid)};persist(null,{...data,[client]:orders},null);};

  // PAYMENT CRUD
  const savePayment=(client:string,oid:string,iid:string,p:any)=>{
    const orders=[...getOrders(client)];const oi=orders.findIndex((o:any)=>o.id===oid);if(oi<0)return;
    const invs=[...orders[oi].invoices];const ii=invs.findIndex((i:any)=>i.id===iid);if(ii<0)return;
    const pays=[...(invs[ii].payments||[])];
    if(p.id){const pi=pays.findIndex((pp:any)=>pp.id===p.id);if(pi>=0)pays[pi]={...pays[pi],...p};}
    else pays.push({...p,id:Date.now().toString()});
    invs[ii]={...invs[ii],payments:pays};orders[oi]={...orders[oi],invoices:invs};
    persist(null,{...data,[client]:orders},null);setModal(null);
  };
  const delPayment=(client:string,oid:string,iid:string,pid:string)=>{
    const orders=[...getOrders(client)];const oi=orders.findIndex((o:any)=>o.id===oid);if(oi<0)return;
    const invs=[...orders[oi].invoices];const ii=invs.findIndex((i:any)=>i.id===iid);if(ii<0)return;
    invs[ii]={...invs[ii],payments:invs[ii].payments.filter((p:any)=>p.id!==pid)};
    orders[oi]={...orders[oi],invoices:invs};persist(null,{...data,[client]:orders},null);
  };

  if(!data||!clients)return<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",fontFamily:"system-ui",color:C.t3,fontSize:14}}>Chargement…</div>;

  const special=["kpi","dashboard","tresorerie","rapport","catalogue","documents","logs"];
  const getConfig=(c:string)=>configs[c]||{accountNumber:"",termId:"net60",customDays:0};

  // ── Compute global alerts (for ticker on all pages) ──────────────
  const _allOrders=getAllOrders();
  const _allInvoices=_allOrders.flatMap((o:any)=>(o.invoices||[]).map((i:any)=>({...i,_client:o._client,_po:o.poNumber,_oid:o.id})));
  const globalAlerts:(()=>{level:string,icon:string,text:string,detail:string}[])=()=>{
    const alerts:any[]=[];
    // P1 — Factures échues
    const _echues=_allInvoices.filter((i:any)=>["overdue","ov_part"].includes(payStatus(i).key));
    const _echuesAmt=_echues.reduce((s:number,i:any)=>s+payStatus(i).rem,0);
    if(_echues.length>0) alerts.push({level:"critical",icon:"ti-clock-exclamation",text:`${_echues.length} facture${_echues.length>1?"s":""} échue${_echues.length>1?"s":""}`,detail:`${fmt(_echuesAmt)} € à recouvrer`});
    // P2 — Facturées non expédiées
    const _factNonExp=_allOrders.filter((o:any)=>o.status==="fact_non_exp");
    if(_factNonExp.length>0) alerts.push({level:"critical",icon:"ti-alert-circle",text:`${_factNonExp.length} commande${_factNonExp.length>1?"s":""} facturée${_factNonExp.length>1?"s":""} non expédiée${_factNonExp.length>1?"s":""}`,detail:_factNonExp.map((o:any)=>o.poNumber).join(", ")});
    // P3 — Échéances dans 7 jours
    const _soon=_allInvoices.filter((i:any)=>["today","soon","soon_part"].includes(payStatus(i).key));
    const _soonAmt=_soon.reduce((s:number,i:any)=>s+payStatus(i).rem,0);
    if(_soon.length>0) alerts.push({level:"warning",icon:"ti-bell-ringing",text:`${_soon.length} échéance${_soon.length>1?"s":""} dans les 7 prochains jours`,detail:`${fmt(_soonAmt)} € à encaisser`});
    // P4 — En attente FDI
    const _fdi=_allOrders.filter((o:any)=>o.status==="attente_fdi");
    if(_fdi.length>0) alerts.push({level:"warning",icon:"ti-file-alert",text:`${_fdi.length} commande${_fdi.length>1?"s":""} en attente FDI`,detail:_fdi.map((o:any)=>o.poNumber).join(", ")});
    // P5 — Retards livraison
    const _late=_allOrders.filter((o:any)=>{if(!o.expectedDate||o.status==="annule")return false;const exp=new Date(o.expectedDate+"T00:00:00"),t=new Date();t.setHours(0,0,0,0);const inv=(o.invoices||[]).reduce((s:number,i:any)=>s+(+i.amount||0),0);return exp<t&&inv<(+o.amount||0)*0.99;});
    if(_late.length>0) alerts.push({level:"info",icon:"ti-truck-off",text:`${_late.length} livraison${_late.length>1?"s":""} en retard`,detail:_late.map((o:any)=>`${o._client} ${o.poNumber}`).join(", ")});
    return alerts.slice(0,5);
  };
  const tickerAlerts=globalAlerts();

  if(!session) return <LoginScreen onLogin={(s:any)=>setSession(s)}/>;

  return(
    <div style={{display:"flex",height:"100vh",fontFamily:"'Inter',system-ui,sans-serif",background:C.page,overflow:"hidden",position:"relative"}}>
      {showUserMgr&&<UserManager session={session} onClose={()=>setShowUserMgr(false)}/>}

      {/* ── SIDEBAR ─────────────────────────────────────────── */}
      {/* Mobile overlay backdrop */}
      {isMobile&&mobileMenuOpen&&<div onClick={()=>setMobileMenuOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:49}}/>}
      <aside style={{
        width:isMobile?(mobileMenuOpen?280:0):(sideOpen?220:52),
        background:C.side,display:"flex",flexDirection:"column",flexShrink:0,
        transition:"width .25s cubic-bezier(.4,0,.2,1)",overflow:"hidden",
        position:isMobile?"fixed":"relative",
        top:0,left:0,height:"100vh",
        zIndex:isMobile?50:1,
        boxShadow:isMobile&&mobileMenuOpen?"4px 0 20px rgba(0,0,0,.3)":"none"
      }}>
        {/* Logo */}
        <div style={{display:"flex",alignItems:"center",justifyContent:sideOpen?"space-between":"center",padding:"0 14px",height:56,borderBottom:"1px solid rgba(255,255,255,.06)",flexShrink:0}}>
          {sideOpen&&(
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:28,height:28,borderRadius:7,background:"linear-gradient(135deg,#3B82F6,#8B5CF6)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <i className="ti ti-box" style={{fontSize:15,color:"#fff"}} aria-hidden="true"/>
              </div>
              <span style={{fontWeight:700,fontSize:13,color:"#F1F5F9",letterSpacing:".01em"}}>OrderTrack</span>
            </div>
          )}
          <button onClick={()=>setSideOpen(!sideOpen)} style={{background:"transparent",border:"none",color:"#4B5563",cursor:"pointer",padding:4,lineHeight:1,borderRadius:5,display:"flex"}}>
            <i className={`ti ${sideOpen?"ti-layout-sidebar-left-collapse":"ti-layout-sidebar-left-expand"}`} style={{fontSize:17}} aria-hidden="true"/>
          </button>
        </div>
        {/* Nav */}
        <nav style={{flex:1,overflowY:"auto",padding:"10px 8px",display:"flex",flexDirection:"column",gap:2}}>
          {sideOpen&&<p style={{fontSize:10,color:"#374151",fontWeight:600,letterSpacing:".07em",textTransform:"uppercase",padding:"8px 6px 4px",margin:0}}>Général</p>}
          <SBtn icon="ti-layout-dashboard" label={t(lang,"nav_dashboard")} active={page==="kpi"} open={sideOpen} onClick={()=>{setPage("kpi");if(isMobile)setMobileMenuOpen(false);}}/>
          <SBtn icon="ti-table-column" label={t(lang,"nav_compilation")} active={page==="dashboard"} open={sideOpen} onClick={()=>{setPage("dashboard");if(isMobile)setMobileMenuOpen(false);}}/>
          <SBtn icon="ti-search" label={t(lang,"nav_search")} active={false} open={sideOpen} onClick={()=>{setShowSearch(true);if(isMobile)setMobileMenuOpen(false);}}/>
          <SBtn icon="ti-chart-area-line" label="Trésorerie" active={page==="tresorerie"} open={sideOpen} onClick={()=>{setPage("tresorerie");if(isMobile)setMobileMenuOpen(false);}}/>
          <SBtn icon="ti-file-report" label="Rapport Hebdo" active={page==="rapport"} open={sideOpen} onClick={()=>{setPage("rapport");if(isMobile)setMobileMenuOpen(false);}}/>
          <SBtn icon="ti-receipt" label="Catalogue & Devis" active={page==="catalogue"} open={sideOpen} onClick={()=>{setPage("catalogue");if(isMobile)setMobileMenuOpen(false);}}/>
          <SBtn icon="ti-files" label="Documents" active={page==="documents"} open={sideOpen} onClick={()=>{setPage("documents");if(isMobile)setMobileMenuOpen(false);}}/>

          {sideOpen&&(
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 6px 4px",marginTop:4}}>
              <p style={{fontSize:10,color:"#374151",fontWeight:600,letterSpacing:".07em",textTransform:"uppercase",margin:0}}>Customers</p>
              <button onClick={()=>setModal({type:"client"})} style={{display:"flex",alignItems:"center",gap:4,background:"rgba(99,102,241,.2)",border:"none",color:"#A5B4FC",cursor:"pointer",borderRadius:5,padding:"3px 7px",fontSize:11,fontWeight:500}}>
                <i className="ti ti-plus" style={{fontSize:12}} aria-hidden="true"/> Ajouter
              </button>
            </div>
          )}
          {!sideOpen&&<div style={{height:12}}/>}

          {clients.map(c=>(
            <SCustomerBtn key={c} label={c} active={page===c} open={sideOpen}
              onClick={()=>{setPage(c);if(isMobile)setMobileMenuOpen(false);}}
              onEdit={()=>setModal({type:"client",name:c,cfg:getConfig(c)})}
              onDelete={()=>{if(window.confirm(c+(lang==="en"?" — delete all data?":" — supprimer toutes les données ?")))delCustomer(c);}}
            />
          ))}
        </nav>
        {sideOpen&&(
          <div style={{padding:"10px 16px",borderTop:"1px solid rgba(255,255,255,.05)",display:"flex",flexDirection:"column",gap:8}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:11,color:"#9CA3AF",display:"flex",alignItems:"center",gap:5}}>
                <i className="ti ti-user-circle" style={{fontSize:13}} aria-hidden="true"/>
                {session?.name||"User"}
                {session?.role==="admin"&&<span style={{background:"rgba(37,99,235,.3)",color:"#93C5FD",fontSize:9,padding:"1px 5px",borderRadius:3,fontWeight:700}}>ADMIN</span>}
              </span>
              <div style={{display:"flex",gap:4}}>
                {session?.role==="admin"&&<button onClick={()=>setShowUserMgr(true)} title="Gérer les accès" style={{background:"transparent",border:"none",color:"#6B7280",cursor:"pointer",padding:4,borderRadius:4,display:"flex"}}><i className="ti ti-users" style={{fontSize:14}} aria-hidden="true"/></button>}
                <button onClick={logout} title="Se déconnecter" style={{background:"transparent",border:"none",color:"#6B7280",cursor:"pointer",padding:4,borderRadius:4,display:"flex"}}><i className="ti ti-logout" style={{fontSize:14}} aria-hidden="true"/></button>
                {session?.role==="admin"&&<button onClick={()=>setPage("logs")} title="Logs d'activité" style={{background:"transparent",border:"none",color:"#6B7280",cursor:"pointer",padding:4,borderRadius:4,display:"flex"}}><i className="ti ti-activity" style={{fontSize:14}} aria-hidden="true"/></button>}
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:11,color:"#374151"}}>{clients.length} clients · {getAllOrders().length}</span>
              <div style={{display:"flex",background:"rgba(255,255,255,.06)",borderRadius:6,overflow:"hidden"}}>
                {(["fr","en"] as Lang[]).map(l=>(
                  <button key={l} onClick={()=>setLang(l)} style={{padding:"4px 10px",border:"none",background:lang===l?"#2563EB":"transparent",color:lang===l?"#fff":"#6B7280",fontWeight:lang===l?700:400,fontSize:11,cursor:"pointer",letterSpacing:".03em",textTransform:"uppercase"}}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <SyncBadge status={syncStatus} lastSync={lastSync} lang={lang}
              onRefresh={async()=>{
                setSyncStatus("syncing");
                const result=await cloudLoad();
                const cloud=result?.payload||null;
                if(cloud){
                  setCustomers(cloud.clients||DEFAULT_CLIENTS);
                  setData(migrateRDT(cloud.orders||{}));
                  setConfigs(cloud.configs||{});
                  try{localStorage.setItem(KEY,JSON.stringify(cloud));}catch{}
                  setSyncStatus("ok");
                  setLastSync(new Date().toLocaleTimeString("fr-FR"));
                } else setSyncStatus("offline");
              }}
            />
          </div>
        )}
      </aside>

      {/* ── MAIN ────────────────────────────────────────────── */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",marginLeft:isMobile?0:undefined}}>
        {/* Mobile top bar */}
        {isMobile&&(
          <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",background:C.side,flexShrink:0,zIndex:10}}>
            <button onClick={()=>setMobileMenuOpen(!mobileMenuOpen)} style={{background:"transparent",border:"none",color:"#9CA3AF",cursor:"pointer",padding:4,display:"flex"}}>
              <i className="ti ti-menu-2" style={{fontSize:22,color:"#F1F5F9"}} aria-hidden="true"/>
            </button>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:24,height:24,borderRadius:6,background:"linear-gradient(135deg,#3B82F6,#8B5CF6)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <i className="ti ti-box" style={{fontSize:13,color:"#fff"}} aria-hidden="true"/>
              </div>
              <span style={{fontWeight:700,fontSize:14,color:"#F1F5F9"}}>OrderTrack</span>
            </div>
            <div style={{flex:1}}/>
            <span style={{fontSize:11,color:"#6B7280"}}>{page==="kpi"?t(lang,"nav_dashboard"):page==="dashboard"?t(lang,"nav_compilation"):page}</span>
          </div>
        )}
        {/* Alert Ticker */}
        {tickerAlerts.length>0&&<AlertTicker alerts={tickerAlerts} lang={lang}/>}
        {/* Offline banner */}
        {!isOnline&&(
          <div style={{background:"#92400E",padding:"7px 20px",display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
            <i className="ti ti-wifi-off" style={{fontSize:14,color:"#FCD34D"}} aria-hidden="true"/>
            <span style={{fontSize:12,fontWeight:600,color:"#FDE68A"}}>Hors ligne — données locales uniquement</span>
          </div>
        )}
        {/* Update notification from another device */}
        {updateAlert&&(
          <div style={{background:"#1D4ED8",padding:"8px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,animation:"slideIn .3s ease-out"}}>
            <span style={{fontSize:12,fontWeight:600,color:"#BFDBFE",display:"flex",alignItems:"center",gap:8}}>
              <i className="ti ti-refresh" style={{fontSize:14,color:"#93C5FD"}} aria-hidden="true"/>
              {updateAlert}
            </span>
            <button onClick={()=>setUpdateAlert(null)} style={{background:"transparent",border:"none",color:"#93C5FD",cursor:"pointer",fontSize:16}}>✕</button>
          </div>
        )}
        <main style={{flex:1,overflow:"auto",padding:isMobile?"16px":"28px 32px"}}>
        {page==="kpi"&&<KpiPage clients={clients} data={data} configs={configs} getStats={getStats} getAllOrders={getAllOrders} setPage={setPage} setModal={setModal} selYear={selYear} setSelYear={setSelYear} lang={lang} isMobile={isMobile}/>}
        {page==="dashboard"&&<CompilPage getStats={getStats} clients={clients} configs={configs} setPage={setPage} selYear={selYear} setSelYear={setSelYear} lang={lang} isMobile={isMobile}/>}
        {page==="tresorerie"&&<TresoreriePage getAllOrders={getAllOrders} clients={clients} lang={lang} isMobile={isMobile}/>}
        {page==="rapport"&&<WeeklyReportPage getAllOrders={getAllOrders} clients={clients} data={data} configs={configs} lang={lang} isMobile={isMobile}/>}
        {page==="catalogue"&&<CataloguePage clients={clients} lang={lang} isMobile={isMobile}/>}
        {page==="documents"&&<DocumentsPage isMobile={isMobile}/>}
        {page==="logs"&&<ActivityLogsPage session={session}/>}
        {!special.includes(page)&&(
          <CustomerPage client={page} cfg={getConfig(page)} orders={getOrders(page)} stats={getStats(page)}
            focusOrderId={focusOrderId} onClearFocus={()=>setFocusOrderId(null)} lang={lang} isMobile={isMobile}
            onSaveOrder={(f:any)=>saveOrder(page,f)}
            onAdd={()=>setModal({type:"order",client:page})}
            onEditOrder={(o:any)=>setModal({type:"order",client:page,order:o})}
            onDelOrder={(id:string)=>delOrder(page,id)}
            onAddInv={(o:any)=>setModal({type:"invoice",client:page,order:o,cfg:getConfig(page)})}
            onEditInv={(o:any,i:any)=>setModal({type:"invoice",client:page,order:o,invoice:i,cfg:getConfig(page)})}
            onDelInv={(oid:string,iid:string)=>delInvoice(page,oid,iid)}
            onAddPay={(o:any,i:any)=>setModal({type:"payment",client:page,order:o,invoice:i})}
            onEditPay={(o:any,i:any,p:any)=>setModal({type:"payment",client:page,order:o,invoice:i,payment:p})}
            onDelPay={(oid:string,iid:string,pid:string)=>delPayment(page,oid,iid,pid)}
            onEditCustomer={()=>setModal({type:"client",name:page,cfg:getConfig(page)})}
            onDelCustomer={()=>{if(window.confirm(`${t(lang,"confirm_del_client",{name:page})}`))delCustomer(page);}}
          />
        )}
        </main>
      </div>

      {/* ── MODALS ──────────────────────────────────────────── */}
      {modal&&(
        <div style={{position:"absolute",inset:0,background:"rgba(15,23,42,.55)",display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",zIndex:100,backdropFilter:"blur(2px)"}} onClick={(e:any)=>{if(e.target===e.currentTarget)setModal(null);}}>
          {modal.type==="client"&&<CustomerModal name={modal.name} cfg={modal.cfg} lang={lang} onSave={(n:string,c:any)=>{const ok=modal.name?editCustomer(modal.name,n,c):addCustomer(n,c);if(ok)setModal(null);else alert(lang==="en"?"Invalid or duplicate name.":"Nom invalide ou déjà utilisé.");}} onClose={()=>setModal(null)}/>}
          {modal.type==="order"&&<OrderModal client={modal.client} order={modal.order} lang={lang} onSave={(f:any)=>saveOrder(modal.client,f)} onClose={()=>setModal(null)}/>}
          {modal.type==="invoice"&&<InvoiceModal client={modal.client} order={modal.order} invoice={modal.invoice} cfg={modal.cfg} lang={lang} onSave={(f:any)=>saveInvoice(modal.client,modal.order.id,f)} onClose={()=>setModal(null)}/>}
          {modal.type==="payment"&&<PaymentModal invoice={modal.invoice} payment={modal.payment} lang={lang} onSave={(f:any)=>savePayment(modal.client,modal.order.id,modal.invoice.id,f)} onClose={()=>setModal(null)}/>}
          {modal.type==="report"&&<ReportModal clients={clients} data={data} configs={configs} lang={lang} onClose={()=>setModal(null)}/>}
        </div>
      )}
      {showSearch&&<SearchOverlay clients={clients} data={data} lang={lang}
        navigate={(client:string,orderId:string|null)=>{
          setFocusOrderId(orderId);
          setPage(client);
          setShowSearch(false);
        }}
        onClose={()=>setShowSearch(false)}/>}
    </div>
  );
}

// ─── SYNC BADGE ──────────────────────────────────────────────────────────────
function SyncBadge({status,lastSync,lang,onRefresh}:any){
  const cfg:any={
    idle:    {icon:"ti-cloud",         color:"#4B5563", bg:"rgba(255,255,255,.06)", label:""},
    syncing: {icon:"ti-loader-2",      color:"#60A5FA", bg:"rgba(37,99,235,.15)",   label:lang==="fr"?"Sync…":"Syncing…",    spin:true},
    ok:      {icon:"ti-cloud-check",   color:"#34D399", bg:"rgba(52,211,153,.12)",  label:lang==="fr"?"Synchronisé":"Synced"},
    offline: {icon:"ti-cloud-off",     color:"#F87171", bg:"rgba(239,68,68,.12)",   label:lang==="fr"?"Hors ligne":"Offline"},
    error:   {icon:"ti-cloud-exclamation",color:"#FBBF24",bg:"rgba(251,191,36,.12)",label:lang==="fr"?"Erreur sync":"Sync error"},
  };
  const c=cfg[status]||cfg.idle;
  return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:c.bg,borderRadius:6,padding:"5px 8px"}}>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <i className={`ti ${c.icon}${c.spin?" rotating":""}`} style={{fontSize:13,color:c.color}} aria-hidden="true"/>
        <span style={{fontSize:10,color:c.color,fontWeight:600}}>{c.label}</span>
        {lastSync&&status==="ok"&&<span style={{fontSize:9,color:"#4B5563"}}>{lastSync}</span>}
      </div>
      {(status==="offline"||status==="error")&&(
        <button onClick={onRefresh} style={{fontSize:9,background:"transparent",border:`1px solid ${c.color}40`,color:c.color,padding:"2px 6px",borderRadius:4,cursor:"pointer"}}>
          {lang==="fr"?"Réessayer":"Retry"}
        </button>
      )}
    </div>
  );
}

// ─── ALERT TICKER ────────────────────────────────────────────────────────────
function AlertTicker({alerts,lang="fr"}:any){
  const[idx,setIdx]=useState(0);
  const[blink,setBlink]=useState(true);
  const[hovered,setHovered]=useState(false);

  useEffect(()=>{
    if(hovered)return;
    const t=setInterval(()=>setIdx(i=>(i+1)%alerts.length),3500);
    return()=>clearInterval(t);
  },[alerts.length,hovered]);

  useEffect(()=>{
    setBlink(false);
    const t=setTimeout(()=>setBlink(true),100);
    return()=>clearTimeout(t);
  },[idx]);

  const LEVEL_STYLE:any={
    critical:{bg:"#7F1D1D",border:"#DC2626",dot:"#FCA5A5",icon:"#FCA5A5",text:"#FEE2E2",detail:"#FECACA"},
    warning: {bg:"#78350F",border:"#D97706",dot:"#FCD34D",icon:"#FCD34D",text:"#FEF3C7",detail:"#FDE68A"},
    info:    {bg:"#1E3A5F",border:"#2563EB",dot:"#93C5FD",icon:"#93C5FD",text:"#DBEAFE",detail:"#BFDBFE"},
  };
  const cur=alerts[idx]||alerts[0];
  const sty=LEVEL_STYLE[cur.level]||LEVEL_STYLE.info;

  return(
    <div style={{background:sty.bg,borderBottom:`2px solid ${sty.border}`,padding:"0 20px",flexShrink:0,position:"relative",overflow:"hidden"}}
      onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}>
      {/* Animated scan line */}
      <div style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",background:`linear-gradient(90deg,transparent,${sty.border}18,transparent)`,animation:"scanline 3s linear infinite",pointerEvents:"none"}}/>
      <style>{`@keyframes scanline{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}} @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} .rotating{animation:spin 1s linear infinite;display:inline-block;}`}</style>

      <div style={{display:"flex",alignItems:"center",gap:0,height:38,position:"relative"}}>
        {/* ALERTE label */}
        <div style={{background:sty.border,padding:"0 14px",height:"100%",display:"flex",alignItems:"center",gap:6,flexShrink:0,marginLeft:-20}}>
          {/* Blinking dot */}
          <span style={{width:8,height:8,borderRadius:99,background:blink?sty.dot:"transparent",transition:"background .15s",flexShrink:0,boxShadow:blink?`0 0 6px ${sty.dot}`:""}}/>
          <span style={{fontSize:10,fontWeight:800,color:"#fff",letterSpacing:".12em",textTransform:"uppercase"}}>{t(lang,"alert_label")}</span>
        </div>

        {/* Scrolling alerts */}
        <div style={{flex:1,overflow:"hidden",position:"relative",height:"100%",display:"flex",alignItems:"center",paddingLeft:16}}>
          <div key={idx} style={{display:"flex",alignItems:"center",gap:10,animation:"slideIn .4s ease-out",whiteSpace:"nowrap"}}>
            <style>{`@keyframes slideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
            <i className={`ti ${cur.icon}`} style={{fontSize:15,color:sty.icon,flexShrink:0}} aria-hidden="true"/>
            <span style={{fontSize:12,fontWeight:700,color:sty.text}}>{cur.text}</span>
            <span style={{fontSize:11,color:sty.detail,overflow:"hidden",textOverflow:"ellipsis",maxWidth:400}}>{cur.detail}</span>
          </div>
        </div>

        {/* Pagination dots */}
        <div style={{display:"flex",gap:5,alignItems:"center",flexShrink:0,paddingRight:8}}>
          {alerts.map((_:any,i:number)=>(
            <button key={i} onClick={()=>setIdx(i)} style={{width:i===idx?16:6,height:6,borderRadius:99,background:i===idx?sty.dot:sty.dot+"50",border:"none",cursor:"pointer",padding:0,transition:"all .3s"}}/>
          ))}
        </div>

        {/* Counter */}
        <div style={{fontSize:10,color:sty.detail,fontWeight:600,letterSpacing:".06em",flexShrink:0,paddingLeft:4,paddingRight:4}}>
          {idx+1}/{alerts.length}
        </div>
      </div>
    </div>
  );
}

// ─── KPI PAGE ────────────────────────────────────────────────────────────────
function KpiPage({clients,data,configs,getStats,getAllOrders,setPage,setModal,selYear,setSelYear,lang="fr",isMobile=false}:any){
  const tr=(k:string,v?:any)=>t(lang as Lang,k,v);
  const all=getAllOrders();
  const totPO=all.reduce((s:number,o:any)=>s+(+o.amount||0),0);
  const totInv=all.reduce((s:number,o:any)=>s+(o.invoices||[]).reduce((ss:number,i:any)=>ss+(+i.amount||0),0),0);
  const totPaid=all.reduce((s:number,o:any)=>s+(o.invoices||[]).reduce((ss:number,i:any)=>ss+(i.payments||[]).reduce((sss:number,p:any)=>sss+(+p.amount||0),0),0),0);
  const totOpen=all.reduce((s:number,o:any)=>{const inv=(o.invoices||[]).reduce((ss:number,i:any)=>ss+(+i.amount||0),0);return s+Math.max(0,(+o.amount||0)-inv);},0);
  const totUnpaid=all.reduce((s:number,o:any)=>s+(o.invoices||[]).reduce((ss:number,i:any)=>{const p=(i.payments||[]).reduce((sss:number,pp:any)=>sss+(+pp.amount||0),0);return ss+Math.max(0,(+i.amount||0)-p);},0),0);
  const txFact=totPO>0?(totInv/totPO*100):0;
  const txPay=totInv>0?(totPaid/totInv*100):0;
  const nbCmds=all.length;

  // ── Alertes & échéances ─────────────────────────────────────────────────
  const allInvoices=all.flatMap((o:any)=>(o.invoices||[]).map((i:any)=>({...i,_client:o._client,_po:o.poNumber,_oid:o.id})));
  // Strictement échues : dueDate dépassée + solde > 0
  const echues=allInvoices.filter((i:any)=>["overdue","ov_part"].includes(payStatus(i).key))
    .sort((a:any,b:any)=>new Date(a.dueDate||"9999").getTime()-new Date(b.dueDate||"9999").getTime());
  const echuesAmt=echues.reduce((s:number,i:any)=>s+payStatus(i).rem,0);
  // Prochaines échéances : dans les 30 prochains jours, non soldées
  const upcoming=allInvoices.filter((i:any)=>["today","soon","soon_part"].includes(payStatus(i).key))
    .sort((a:any,b:any)=>new Date(a.dueDate||"9999").getTime()-new Date(b.dueDate||"9999").getTime());
  const upcomingAmt=upcoming.reduce((s:number,i:any)=>s+payStatus(i).rem,0);
  // All alerts combined (for existing badge)
  const overdue=[...echues,...upcoming];
  const overdueAmt=echuesAmt;

  // Commandes sans facture (hors annulé)
  const noInv=all.filter((o:any)=>o.status!=="annule"&&(o.invoices||[]).length===0);
  // Alertes statuts critiques
  const factNonExp=all.filter((o:any)=>o.status==="fact_non_exp");
  const attentesFDI=all.filter((o:any)=>o.status==="attente_fdi");
  // Commandes en retard livraison
  const lateDelivery=all.filter((o:any)=>{if(!o.expectedDate||o.status==="annule")return false;const exp=new Date(o.expectedDate+"T00:00:00"),t=new Date();t.setHours(0,0,0,0);const inv=(o.invoices||[]).reduce((s:number,i:any)=>s+(+i.amount||0),0);return exp<t&&inv<(+o.amount||0)*0.99;});

  // Top clients
  const cStats=clients.map((c:string)=>({name:c,...getStats(c),nbCmds:(data?.[c]||[]).length,acc:configs[c]?.accountNumber||"—",term:PAY_TERMS.find((t:any)=>t.id===(configs[c]?.termId||"net60"))?.label||"—"})).sort((a:any,b:any)=>b.openOrders-a.openOrders);

  // Monthly — filtered by selYear
  const monthly=MONTHS.map((_,mi)=>{let po=0,inv=0,paid=0;all.forEach((o:any)=>{
    const od=o.date?new Date(o.date+"T00:00:00"):null;
    if(od&&od.getMonth()===mi&&od.getFullYear()===selYear)po+=(+o.amount||0);
    (o.invoices||[]).forEach((i:any)=>{
      const id=i.date?new Date(i.date+"T00:00:00"):null;
      if(id&&id.getMonth()===mi&&id.getFullYear()===selYear){inv+=(+i.amount||0);paid+=(i.payments||[]).reduce((s:number,p:any)=>s+(+p.amount||0),0);}
    });
  });return{po,inv,paid};});
  const maxM=Math.max(...monthly.map(m=>Math.max(m.po,m.inv,m.paid)),1);

  // Status breakdown
  const stCount:Record<string,{n:number,c:string,bg:string,icon:string}>={};
  all.forEach((o:any)=>{const m=getStatusMeta(o.status||"");const sty2=SS[o.status||""]||{c:C.t2,bg:"#F1F5F9"};const lbl=m.label||o.status||"—";if(!stCount[lbl])stCount[lbl]={n:0,c:sty2.c,bg:sty2.bg,icon:m.icon||"ti-circle"};stCount[lbl].n++;});

  return(
    <div style={{display:"flex",flexDirection:"column",gap:24}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between"}}>
        <div>
          <h1 style={{margin:"0 0 4px",fontSize:22,fontWeight:700,color:C.t1}}>{tr("page_dashboard")}</h1>
          <p style={{margin:0,color:C.t3,fontSize:13}}>{new Date().toLocaleDateString(lang==="en"?"en-GB":"fr-FR",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</p>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div style={{display:"flex",background:"#fff",border:`1px solid ${C.b}`,borderRadius:C.r,overflow:"hidden"}}>
            {[2025,2026,2027,2028,2029,2030].map(y=>(
              <button key={y} onClick={()=>setSelYear(y)} style={{padding:"7px 14px",border:"none",background:y===selYear?C.blue:"transparent",color:y===selYear?"#fff":C.t2,fontWeight:y===selYear?700:400,fontSize:12,cursor:"pointer",transition:"all .15s"}}>{y}</button>
            ))}
          </div>
          {overdueAmt>0&&<div style={{background:C.redL,border:`1px solid ${C.red}30`,borderRadius:C.r,padding:"8px 14px",display:"flex",alignItems:"center",gap:8}}>
            <i className="ti ti-alert-triangle" style={{color:C.red,fontSize:16}} aria-hidden="true"/>
            <span style={{color:C.redDk,fontSize:12,fontWeight:600}}>{fmt(echuesAmt)} € de factures échues · {echues.length} facture{echues.length>1?"s":""}</span>
          </div>}
          <button onClick={()=>setModal({type:"report"})} style={{display:"flex",alignItems:"center",gap:6,background:"#fff",border:`1px solid ${C.b}`,color:C.t2,borderRadius:C.r,padding:"8px 14px",fontSize:12,fontWeight:600,cursor:"pointer"}}>
            <i className="ti ti-file-download" style={{fontSize:15}} aria-hidden="true"/> Rapports PDF
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(6,1fr)",gap:isMobile?10:14}}>
        <Kpi icon="ti-building-store" label={tr("kpi_clients")} val={clients.length} sub={`${clients.filter((c:string)=>(data?.[c]||[]).length>0).length} ${tr("kpi_active")}`} c={C.purple} bg={C.purpleL}/>
        <Kpi icon="ti-clipboard-list" label={tr("kpi_orders")} val={nbCmds} sub={`${noInv.length} ${tr("kpi_no_invoice")}`} c={C.blue} bg={C.blueL}/>
        <Kpi icon="ti-file-invoice" label={tr("kpi_po")} val={`${fmtK(totPO)} €`} sub={tr("commanded")} c={C.t2} bg="#F1F5F9"/>
        <Kpi icon="ti-check" label={tr("kpi_invoiced")} val={`${fmtK(totInv)} €`} sub={`${txFact.toFixed(1)}% ${tr("kpi_invoiced_pct")}`} c={C.teal} bg={C.tealL}/>
        <Kpi icon="ti-coin" label={tr("kpi_collected")} val={`${fmtK(totPaid)} €`} sub={`${txPay.toFixed(1)}% ${tr("kpi_collected_pct")}`} c={C.green} bg={C.greenL}/>
        <Kpi icon="ti-hourglass-low" label="Factures en cours" val={`${fmtK(totUnpaid)} €`} sub={echues.length>0?`⚠ ${echues.length} échu${echues.length>1?"es":"e"}${upcoming.length>0?` · ${upcoming.length} à venir`:""}`:upcoming.length>0?`${upcoming.length} échéance${upcoming.length>1?"s":""} à venir`:"Aucune alerte"} c={echues.length>0?C.red:upcoming.length>0?C.amber:C.t3} bg={echues.length>0?C.redL:upcoming.length>0?C.amberL:"#F8FAFC"}/>
      </div>

      {/* Row 2 : jauges + alertes paiements */}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"5fr 4fr",gap:isMobile?12:16}}>
        {/* Jauge double */}
        <Card title="Progression globale" icon="ti-target">
          <div style={{display:"flex",gap:24,marginBottom:20}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.t2,marginBottom:6}}>
                <span>Taux de facturation</span><strong style={{color:txFact>=80?C.greenDk:txFact>=50?C.amberDk:C.redDk}}>{txFact.toFixed(1)}%</strong>
              </div>
              <Track val={txFact} max={100} color={txFact>=80?C.green:txFact>=50?C.amber:C.red} h={10}/>
            </div>
            <div style={{flex:1}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.t2,marginBottom:6}}>
                <span>Taux d'encaissement</span><strong style={{color:txPay>=80?C.greenDk:txPay>=50?C.amberDk:C.redDk}}>{txPay.toFixed(1)}%</strong>
              </div>
              <Track val={txPay} max={100} color={txPay>=80?C.green:txPay>=50?C.amber:C.red} h={10}/>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {cStats.filter((c:any)=>c.totalPO>0).map((c:any)=>{
              const tf=c.totalPO>0?(c.totalInv/c.totalPO*100):0;
              const tp=c.totalInv>0?(c.totalPaid/c.totalInv*100):0;
              return(
                <div key={c.name} style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>setPage(c.name)}>
                  <span style={{fontSize:12,fontWeight:500,color:C.t1,width:110,flexShrink:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</span>
                  <div style={{flex:1,display:"flex",flexDirection:"column",gap:3}}>
                    <Track val={tf} max={100} color={tf>=80?C.teal:tf>=50?C.amber:C.red} h={5} label={`${tf.toFixed(0)}% facturé`}/>
                    <Track val={tp} max={100} color={tp>=80?C.green:tp>=50?C.amber:C.red} h={4} label={`${tp.toFixed(0)}% encaissé`}/>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Alertes & Échéances */}
        <Card title="Alertes & Échéances" icon="ti-bell-ringing" badge={echues.length>0?{n:echues.length,color:C.red}:upcoming.length>0?{n:upcoming.length,color:C.amber}:undefined}>
          {echues.length===0&&upcoming.length===0&&noInv.length===0&&lateDelivery.length===0?(
            <div style={{textAlign:"center",padding:"28px 0"}}>
              <i className="ti ti-circle-check" style={{fontSize:36,color:C.green,display:"block",marginBottom:8}} aria-hidden="true"/>
              <div style={{fontSize:13,fontWeight:600,color:C.greenDk}}>Tout est en ordre</div>
              <div style={{fontSize:12,color:C.t3,marginTop:3}}>Aucune alerte en cours</div>
            </div>
          ):(
            <div style={{display:"flex",flexDirection:"column",gap:12,maxHeight:400,overflowY:"auto"}}>
              {/* ── Section Factures ÉCHUES ── */}
              {echues.length>0&&(
                <div>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                    <span style={{fontSize:11,fontWeight:700,color:C.redDk,textTransform:"uppercase",letterSpacing:".05em",display:"flex",alignItems:"center",gap:5}}>
                      <i className="ti ti-clock-exclamation" style={{fontSize:13}} aria-hidden="true"/> Factures échues ({echues.length})
                    </span>
                    <span style={{fontSize:11,fontWeight:700,color:C.redDk,background:C.redL,padding:"2px 8px",borderRadius:4}}>{fmt(echuesAmt)} €</span>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {echues.map((inv:any,i:number)=>{
                      const ps=payStatus(inv);
                      const days=inv.dueDate?Math.abs(diffD(inv.dueDate)):0;
                      return(
                        <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",background:C.redL,border:`1px solid ${C.red}25`,borderRadius:C.rSm,padding:"9px 12px",borderLeft:`3px solid ${C.red}`}}>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                              <span style={{fontSize:12,fontWeight:700,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{inv._client} — {inv._po}</span>
                              <span style={{fontSize:11,fontWeight:700,color:C.redDk,flexShrink:0}}>{fmt(ps.rem)} €</span>
                            </div>
                            <div style={{display:"flex",gap:8,marginTop:3,flexWrap:"wrap"}}>
                              <span style={{fontSize:10,color:C.t2}}>{inv.invoiceNumber}</span>
                              <span style={{fontSize:10,color:C.t2}}>Émise le {fmtD(inv.date)}</span>
                              <span style={{fontSize:10,fontWeight:700,color:C.redDk}}>Échéance : {fmtD(inv.dueDate)}</span>
                              <span style={{fontSize:10,background:C.red,color:"#fff",padding:"1px 6px",borderRadius:3,fontWeight:700}}>{days}j de retard</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{marginTop:6,textAlign:"right",fontSize:11,fontWeight:700,color:C.redDk,background:C.redL,borderRadius:C.rSm,padding:"5px 10px",border:`1px solid ${C.red}30`}}>
                    Total échu non réglé : {fmt(echuesAmt)} €
                  </div>
                </div>
              )}
              {/* ── Section Prochaines échéances ── */}
              {upcoming.length>0&&(
                <div>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                    <span style={{fontSize:11,fontWeight:700,color:C.amberDk,textTransform:"uppercase",letterSpacing:".05em",display:"flex",alignItems:"center",gap:5}}>
                      <i className="ti ti-clock" style={{fontSize:13}} aria-hidden="true"/> Prochaines échéances ({upcoming.length})
                    </span>
                    <span style={{fontSize:11,fontWeight:700,color:C.amberDk,background:C.amberL,padding:"2px 8px",borderRadius:4}}>{fmt(upcomingAmt)} €</span>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {upcoming.map((inv:any,i:number)=>{
                      const ps=payStatus(inv);
                      const days=inv.dueDate?diffD(inv.dueDate):null;
                      return(
                        <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",background:C.amberL,border:`1px solid ${C.amber}25`,borderRadius:C.rSm,padding:"9px 12px",borderLeft:`3px solid ${C.amber}`}}>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                              <span style={{fontSize:12,fontWeight:700,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{inv._client} — {inv._po}</span>
                              <span style={{fontSize:11,fontWeight:700,color:C.amberDk,flexShrink:0}}>{fmt(ps.rem)} €</span>
                            </div>
                            <div style={{display:"flex",gap:8,marginTop:3,flexWrap:"wrap"}}>
                              <span style={{fontSize:10,color:C.t2}}>{inv.invoiceNumber}</span>
                              <span style={{fontSize:10,color:C.t2}}>Émise le {fmtD(inv.date)}</span>
                              <span style={{fontSize:10,fontWeight:700,color:C.amberDk}}>Échéance : {fmtD(inv.dueDate)}</span>
                              {days===0&&<span style={{fontSize:10,background:C.amber,color:"#fff",padding:"1px 6px",borderRadius:3,fontWeight:700}}>Aujourd'hui !</span>}
                              {days!==null&&days>0&&<span style={{fontSize:10,background:C.amberDk,color:"#fff",padding:"1px 6px",borderRadius:3,fontWeight:700}}>Dans {days}j</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{marginTop:6,textAlign:"right",fontSize:11,fontWeight:700,color:C.amberDk,background:C.amberL,borderRadius:C.rSm,padding:"5px 10px",border:`1px solid ${C.amber}30`}}>
                    Total à encaisser prochainement : {fmt(upcomingAmt)} €
                  </div>
                </div>
              )}
              {/* ── Alertes diverses ── */}
              {(noInv.length>0||lateDelivery.length>0)&&(
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {noInv.length>0&&<Alert icon="ti-clipboard-off" text={`${noInv.length} commande${noInv.length>1?"s":""} sans facture`} color={C.amber} bg={C.amberL}/>}
                  {lateDelivery.length>0&&<Alert icon="ti-truck-off" text={`${lateDelivery.length} livraison${lateDelivery.length>1?"s":""} en retard de livraison`} color={C.red} bg={C.redL}/>}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Row 3 : graphiques */}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"2fr 1fr",gap:isMobile?12:16}}>
        <Card title="Évolution mensuelle 2026" icon="ti-chart-bar">
          <div style={{display:"flex",gap:16,marginBottom:12}}>
            {[["#3B82F6","PO"],["#0D9488","Facturé"],["#059669","Encaissé"]].map(([col,lbl])=>(
              <span key={lbl} style={{fontSize:11,color:C.t3,display:"flex",alignItems:"center",gap:5}}><span style={{width:10,height:10,borderRadius:2,background:col,display:"inline-block"}}/>{lbl}</span>
            ))}
          </div>
          <div style={{display:"flex",alignItems:"flex-end",gap:3,height:130}}>
            {monthly.map((m:any,i:number)=>(
              <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,height:"100%",justifyContent:"flex-end"}}>
                <div style={{width:"100%",display:"flex",gap:1.5,alignItems:"flex-end",justifyContent:"center",height:"100%"}}>
                  {[{v:m.po,c:"#3B82F6"},{v:m.inv,c:"#0D9488"},{v:m.paid,c:"#059669"}].map(({v,c},j)=>(
                    <div key={j} title={`${fmt(v)} €`} style={{flex:1,background:c,borderRadius:"3px 3px 0 0",height:`${v>0?(v/maxM*100):1}%`,minHeight:v>0?3:1,opacity:.85}}/>
                  ))}
                </div>
                <div style={{fontSize:9,color:C.t3,whiteSpace:"nowrap"}}>{MONTHS[i]}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Statuts commandes" icon="ti-chart-donut">
          {nbCmds===0?<div style={{textAlign:"center",padding:32,color:C.t3,fontSize:12}}>Aucune commande</div>:(
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {Object.entries(stCount).sort((a:any,b:any)=>b[1].n-a[1].n).map(([lbl,info]:any)=>{
                const pct=info.n/nbCmds*100;
                return(
                  <div key={lbl}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
                      <span style={{display:"flex",alignItems:"center",gap:6}}>
                        <i className={`ti ${info.icon}`} style={{fontSize:12,color:info.c}} aria-hidden="true"/>
                        <span style={{color:C.t1,fontWeight:500}}>{lbl}</span>
                      </span>
                      <span style={{color:C.t2}}>{info.n} <span style={{color:C.t3,fontSize:10}}>({pct.toFixed(0)}%)</span></span>
                    </div>
                    <Track val={pct} max={100} color={info.c} h={5}/>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Row 3b : Tableau factures échues */}
      {echues.length>0&&(
        <Card title={`Détail factures échues — ${fmt(echuesAmt)} € à recouvrer`} icon="ti-clock-exclamation" badge={{n:echues.length,color:C.red}} noPad>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead>
              <tr style={{background:"#FEF2F2",borderBottom:`2px solid ${C.red}30`}}>
                {["Customer","PO #","Invoice #","Date émission","Échéance","Retard","Montant","Payé","Reste dû"].map((h,i)=>(
                  <th key={h} style={{padding:"10px 14px",textAlign:i>=5?"right":"left",color:C.redDk,fontWeight:600,fontSize:11,whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {echues.map((inv:any,i:number)=>{
                const ps=payStatus(inv);
                const days=inv.dueDate?Math.abs(diffD(inv.dueDate)):0;
                const urgColor=days>90?C.redDk:days>30?C.red:"#EF4444";
                return(
                  <tr key={i} style={{borderBottom:`1px solid ${C.b}`,background:i%2===0?"#fff":"#FFF8F8"}}
                    onMouseEnter={(e:any)=>e.currentTarget.style.background="#FEF2F2"}
                    onMouseLeave={(e:any)=>e.currentTarget.style.background=i%2===0?"#fff":"#FFF8F8"}>
                    <td style={{padding:"9px 14px",fontWeight:700,color:C.t1}}>{inv._client}</td>
                    <td style={{padding:"9px 14px",color:C.t2,fontFamily:"monospace",fontSize:11}}>{inv._po}</td>
                    <td style={{padding:"9px 14px",fontWeight:600,color:C.purple}}>{inv.invoiceNumber||"—"}</td>
                    <td style={{padding:"9px 14px",color:C.t2}}>{fmtD(inv.date)}</td>
                    <td style={{padding:"9px 14px",fontWeight:600,color:C.redDk}}>{fmtD(inv.dueDate)}</td>
                    <td style={{padding:"9px 14px",textAlign:"right"}}>
                      <span style={{background:urgColor,color:"#fff",padding:"2px 8px",borderRadius:4,fontWeight:700,fontSize:11}}>{days}j</span>
                    </td>
                    <td style={{padding:"9px 14px",textAlign:"right",fontWeight:600,color:C.teal}}>{fmt(+inv.amount||0)} €</td>
                    <td style={{padding:"9px 14px",textAlign:"right",color:C.green}}>{ps.paid>0?`${fmt(ps.paid)} €`:"—"}</td>
                    <td style={{padding:"9px 14px",textAlign:"right",fontWeight:700,color:C.redDk}}>{fmt(ps.rem)} €</td>
                  </tr>
                );
              })}
              <tr style={{background:"#FEE2E2",borderTop:`2px solid ${C.red}30`}}>
                <td colSpan={8} style={{padding:"10px 14px",textAlign:"right",fontWeight:700,color:C.redDk,fontSize:13}}>TOTAL OVERDUE À RECOUVRER</td>
                <td style={{padding:"10px 14px",textAlign:"right",fontWeight:800,color:C.redDk,fontSize:14}}>{fmt(echuesAmt)} €</td>
              </tr>
            </tbody>
          </table>
        </Card>
      )}

      {/* Row 4 : tableau clients */}
      <Card title="Classement clients" icon="ti-trophy" noPad>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead>
            <tr style={{background:"#F8FAFC",borderBottom:`1px solid ${C.b}`}}>
              {["#","Customer","N° Compte","Conditions paiement","Cmds","PO","Facturé","Encaissé","Factures en cours","Open Orders","Tx Fact."].map((h,i)=>(
                <th key={h} style={{padding:"10px 14px",textAlign:i>=4?"right":"left",color:C.t3,fontWeight:500,fontSize:11,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cStats.map((c:any,i:number)=>{
              const tf=c.totalPO>0?(c.totalInv/c.totalPO*100):0;
              const tfc=tf>=80?C.greenDk:tf>=50?C.amberDk:C.redDk;
              const medals=["🥇","🥈","🥉"];
              return(
                <tr key={c.name} style={{borderBottom:`1px solid ${C.b}`,cursor:"pointer",transition:"background .15s"}} onClick={()=>setPage(c.name)}
                  onMouseEnter={(e:any)=>e.currentTarget.style.background="#F8FAFC"}
                  onMouseLeave={(e:any)=>e.currentTarget.style.background="transparent"}>
                  <td style={{padding:"10px 14px",fontSize:14}}>{medals[i]||<span style={{color:C.t3,fontSize:11}}>{i+1}</span>}</td>
                  <td style={{padding:"10px 14px",fontWeight:600,color:C.t1}}>{c.name}</td>
                  <td style={{padding:"10px 14px",color:C.t3,fontFamily:"monospace",fontSize:11}}>{c.acc}</td>
                  <td style={{padding:"10px 14px"}}><span style={{fontSize:11,background:C.blueL,color:C.blueDk,padding:"2px 7px",borderRadius:4,fontWeight:500}}>{c.term}</span></td>
                  <td style={{padding:"10px 14px",textAlign:"right",color:C.t2}}>{c.nbCmds}</td>
                  <td style={{padding:"10px 14px",textAlign:"right",fontWeight:600,color:C.blue}}>{fmtK(c.totalPO)} €</td>
                  <td style={{padding:"10px 14px",textAlign:"right",fontWeight:600,color:C.teal}}>{fmtK(c.totalInv)} €</td>
                  <td style={{padding:"10px 14px",textAlign:"right",fontWeight:600,color:C.green}}>{fmtK(c.totalPaid)} €</td>
                  <td style={{padding:"10px 14px",textAlign:"right",fontWeight:600,color:c.unpaidInv>0?C.red:C.t3}}>{c.unpaidInv>0?`${fmtK(c.unpaidInv)} €`:"—"}</td>
                  <td style={{padding:"10px 14px",textAlign:"right",fontWeight:600,color:c.openOrders>0?C.amberDk:C.t3}}>{c.openOrders>0?`${fmtK(c.openOrders)} €`:"—"}</td>
                  <td style={{padding:"10px 14px",textAlign:"right"}}>
                    <span style={{fontWeight:700,color:tfc}}>{tf.toFixed(1)}%</span>
                    <div style={{height:4,background:C.b,borderRadius:99,marginTop:4,width:60}}>
                      <div style={{height:"100%",width:`${Math.min(100,tf)}%`,background:tfc,borderRadius:99}}/>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ─── COMPILATION PAGE ────────────────────────────────────────────────────────
function CompilPage({getStats,clients,configs,setPage,selYear,setSelYear,lang="fr"}:any){
  const tr=(k:string,v?:any)=>t(lang as Lang,k,v);
  const all=clients.map((c:string)=>({client:c,...getStats(c,selYear)}));
  const totPO  = all.reduce((s:number,c:any)=>s+c.totalPO,0);
  const totInv = all.reduce((s:number,c:any)=>s+c.totalInv,0);
  const totPaid= all.reduce((s:number,c:any)=>s+c.totalPaid,0);
  const totOpen= all.reduce((s:number,c:any)=>s+c.openOrders,0);
  const txFact = totPO>0?(totInv/totPO*100):0;
  const txPay  = totInv>0?(totPaid/totInv*100):0;
  const maxBar = Math.max(...all.map((c:any)=>c.totalPO),1);

  return(
    <div style={{display:"flex",flexDirection:"column",gap:24}}>

      {/* ── HEADER ── */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
        <div>
          <h1 style={{margin:"0 0 3px",fontSize:22,fontWeight:700,color:C.t1}}>Compilation {selYear}</h1>
          <p style={{margin:0,color:C.t3,fontSize:13}}>Vue consolidée · tous les clients · {clients.length} comptes actifs</p>
        </div>
        <div style={{display:"flex",background:"#fff",border:`1px solid ${C.b}`,borderRadius:C.r,overflow:"hidden",boxShadow:C.sh}}>
          {[2025,2026,2027,2028,2029,2030].map(y=>(
            <button key={y} onClick={()=>setSelYear(y)} style={{padding:"8px 16px",border:"none",borderRight:`1px solid ${C.b}`,background:y===selYear?C.blue:"transparent",color:y===selYear?"#fff":C.t2,fontWeight:y===selYear?700:400,fontSize:13,cursor:"pointer",transition:"all .15s"}}>{y}</button>
          ))}
        </div>
      </div>

      {/* ── KPI STRIP ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:14}}>
        <div style={{background:"#fff",borderRadius:C.rLg,border:`1px solid ${C.b}`,boxShadow:C.sh,padding:"18px 20px"}}>
          <div style={{fontSize:10,color:C.t3,fontWeight:600,textTransform:"uppercase",letterSpacing:".06em",marginBottom:8}}>Total PO {selYear}</div>
          <div style={{fontSize:22,fontWeight:800,color:C.blue,letterSpacing:"-.02em"}}>{fmtK(totPO)} €</div>
          <div style={{fontSize:11,color:C.t3,marginTop:4}}>Montant commandé</div>
        </div>
        <div style={{background:"#fff",borderRadius:C.rLg,border:`1px solid ${C.b}`,boxShadow:C.sh,padding:"18px 20px"}}>
          <div style={{fontSize:10,color:C.t3,fontWeight:600,textTransform:"uppercase",letterSpacing:".06em",marginBottom:8}}>Total facturé</div>
          <div style={{fontSize:22,fontWeight:800,color:C.teal,letterSpacing:"-.02em"}}>{fmtK(totInv)} €</div>
          <div style={{marginTop:6,height:5,background:"#F1F5F9",borderRadius:99}}>
            <div style={{height:"100%",width:`${Math.min(100,txFact)}%`,background:txFact>=80?C.green:txFact>=50?C.teal:C.amber,borderRadius:99,transition:"width .5s"}}/>
          </div>
          <div style={{fontSize:11,color:C.t3,marginTop:4}}>{txFact.toFixed(1)}% du PO</div>
        </div>
        <div style={{background:"#fff",borderRadius:C.rLg,border:`1px solid ${C.b}`,boxShadow:C.sh,padding:"18px 20px"}}>
          <div style={{fontSize:10,color:C.t3,fontWeight:600,textTransform:"uppercase",letterSpacing:".06em",marginBottom:8}}>Total encaissé</div>
          <div style={{fontSize:22,fontWeight:800,color:C.green,letterSpacing:"-.02em"}}>{fmtK(totPaid)} €</div>
          <div style={{marginTop:6,height:5,background:"#F1F5F9",borderRadius:99}}>
            <div style={{height:"100%",width:`${Math.min(100,txPay)}%`,background:C.green,borderRadius:99,transition:"width .5s"}}/>
          </div>
          <div style={{fontSize:11,color:C.t3,marginTop:4}}>{txPay.toFixed(1)}% des factures</div>
        </div>
        <div style={{background:"#fff",borderRadius:C.rLg,border:`1px solid ${C.b}`,boxShadow:C.sh,padding:"18px 20px"}}>
          <div style={{fontSize:10,color:C.t3,fontWeight:600,textTransform:"uppercase",letterSpacing:".06em",marginBottom:8}}>Open Orders</div>
          <div style={{fontSize:22,fontWeight:800,color:C.amberDk,letterSpacing:"-.02em"}}>{fmtK(totOpen)} €</div>
          <div style={{fontSize:11,color:C.t3,marginTop:4}}>Remaining to invoice</div>
        </div>
        <div style={{background:`linear-gradient(135deg,${C.blue},${C.purple})`,borderRadius:C.rLg,boxShadow:C.shMd,padding:"18px 20px",display:"flex",flexDirection:"column",justifyContent:"center"}}>
          <div style={{fontSize:10,color:"rgba(255,255,255,.7)",fontWeight:600,textTransform:"uppercase",letterSpacing:".06em",marginBottom:8}}>Taux global</div>
          <div style={{fontSize:22,fontWeight:800,color:"#fff",letterSpacing:"-.02em"}}>{txFact.toFixed(1)}%</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,.7)",marginTop:4}}>Facturation / Encaiss. {txPay.toFixed(1)}%</div>
        </div>
      </div>

      {/* ── CLIENT BARS + MONTHLY TABLE split layout ── */}
      <div style={{display:"grid",gridTemplateColumns:"380px 1fr",gap:16,alignItems:"start"}}>

        {/* Left — Customer ranking bars */}
        <div style={{background:"#fff",borderRadius:C.rLg,border:`1px solid ${C.b}`,boxShadow:C.sh,overflow:"hidden"}}>
          <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.b}`,display:"flex",alignItems:"center",gap:8}}>
            <i className="ti ti-chart-bar" style={{fontSize:16,color:C.t2}} aria-hidden="true"/>
            <span style={{fontWeight:600,fontSize:13,color:C.t1}}>Classement PO par client</span>
          </div>
          <div style={{padding:"14px 20px",display:"flex",flexDirection:"column",gap:12}}>
            {[...all].sort((a:any,b:any)=>b.totalPO-a.totalPO).map((c:any)=>{
              const tf=c.totalPO>0?(c.totalInv/c.totalPO*100):0;
              const tp=c.totalInv>0?(c.totalPaid/c.totalInv*100):0;
              const barW=c.totalPO>0?(c.totalPO/maxBar*100):0;
              return(
                <div key={c.client} onClick={()=>setPage(c.client)} style={{cursor:"pointer"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontWeight:700,fontSize:12,color:C.t1}}>{c.client}</span>
                      {configs[c.client]?.accountNumber&&<span style={{fontSize:10,color:C.t3,fontFamily:"monospace"}}>{configs[c.client].accountNumber}</span>}
                    </div>
                    <div style={{display:"flex",gap:12,fontSize:11}}>
                      <span style={{color:C.blue,fontWeight:600}}>{fmtK(c.totalPO)} €</span>
                      <span style={{color:C.t3}}>|</span>
                      <span style={{color:tf>=80?C.greenDk:tf>=50?C.amberDk:C.redDk,fontWeight:700}}>{tf.toFixed(0)}%</span>
                    </div>
                  </div>
                  {/* Stacked bar: PO width → INV fill → PAID fill */}
                  <div style={{position:"relative",height:10,background:"#F1F5F9",borderRadius:99,overflow:"hidden"}}>
                    {/* PO base */}
                    <div style={{position:"absolute",left:0,top:0,height:"100%",width:`${barW}%`,background:`${C.blue}22`,borderRadius:99}}/>
                    {/* Facturé */}
                    <div style={{position:"absolute",left:0,top:0,height:"100%",width:`${c.totalPO>0?Math.min(barW,c.totalInv/maxBar*100):0}%`,background:C.teal,borderRadius:99,opacity:.85}}/>
                    {/* Encaissé */}
                    <div style={{position:"absolute",left:0,top:0,height:"100%",width:`${c.totalPO>0?Math.min(barW,c.totalPaid/maxBar*100):0}%`,background:C.green,borderRadius:99}}/>
                  </div>
                  <div style={{display:"flex",gap:10,marginTop:3,fontSize:10,color:C.t3}}>
                    <span style={{color:C.teal}}>Fact. {fmtK(c.totalInv)} €</span>
                    <span>·</span>
                    <span style={{color:C.green}}>Encaissé {fmtK(c.totalPaid)} €</span>
                    {c.openOrders>0&&<><span>·</span><span style={{color:C.amberDk}}>Open {fmtK(c.openOrders)} €</span></>}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Legend */}
          <div style={{padding:"10px 20px",borderTop:`1px solid ${C.b}`,background:"#FAFBFD",display:"flex",gap:16}}>
            {[["#2563EB22","PO commandé"],[C.teal,"Facturé"],[C.green,"Encaissé"]].map(([col,lbl])=>(
              <span key={lbl as string} style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:C.t3}}>
                <span style={{width:10,height:4,borderRadius:99,background:col as string,display:"inline-block"}}/>
                {lbl}
              </span>
            ))}
          </div>
        </div>

        {/* Right — Monthly table with mini bars */}
        <div style={{background:"#fff",borderRadius:C.rLg,border:`1px solid ${C.b}`,boxShadow:C.sh,overflow:"hidden"}}>
          <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.b}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <i className="ti ti-calendar-stats" style={{fontSize:16,color:C.t2}} aria-hidden="true"/>
              <span style={{fontWeight:600,fontSize:13,color:C.t1}}>Activité mensuelle {selYear}</span>
            </div>
            <div style={{display:"flex",gap:12}}>
              {[["#3B82F6","PO"],[C.teal,"Facturé"],[C.green,"Encaissé"]].map(([col,lbl])=>(
                <span key={lbl as string} style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:C.t3}}>
                  <span style={{width:8,height:8,borderRadius:2,background:col as string,display:"inline-block"}}/>
                  {lbl}
                </span>
              ))}
            </div>
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead>
                <tr style={{background:"#F8FAFC"}}>
                  <th style={{padding:"10px 16px",textAlign:"left",color:C.t3,fontWeight:600,fontSize:10,textTransform:"uppercase",letterSpacing:".05em",whiteSpace:"nowrap",borderBottom:`1px solid ${C.b}`}}>Customer</th>
                  {MONTHS.map(m=><th key={m} style={{padding:"10px 6px",textAlign:"center",color:C.t3,fontWeight:600,fontSize:10,minWidth:58,borderBottom:`1px solid ${C.b}`}}>{m}</th>)}
                  <th style={{padding:"10px 14px",textAlign:"right",color:C.blue,fontWeight:700,fontSize:10,background:C.blueL,whiteSpace:"nowrap",borderBottom:`1px solid ${C.b}`}}>PO TOTAL</th>
                  <th style={{padding:"10px 14px",textAlign:"right",color:C.teal,fontWeight:700,fontSize:10,background:C.tealL,whiteSpace:"nowrap",borderBottom:`1px solid ${C.b}`}}>FACTURÉ</th>
                  <th style={{padding:"10px 14px",textAlign:"right",color:C.amberDk,fontWeight:700,fontSize:10,background:C.amberL,whiteSpace:"nowrap",borderBottom:`1px solid ${C.b}`}}>OPEN</th>
                </tr>
              </thead>
              <tbody>
                {all.map(({client,totalPO,totalInv,openOrders,monthly}:any,ri:number)=>{
                  const rowBg=ri%2===0?"#fff":"#FAFBFD";
                  const tf=totalPO>0?(totalInv/totalPO*100):0;
                  const maxMonth=Math.max(...monthly.map((m:any)=>Math.max(m.po,m.inv)),1);
                  return(
                    <tr key={client} style={{background:rowBg,cursor:"pointer",transition:"background .12s"}}
                      onClick={()=>setPage(client)}
                      onMouseEnter={(e:any)=>e.currentTarget.style.background="#EFF6FF"}
                      onMouseLeave={(e:any)=>e.currentTarget.style.background=rowBg}>
                      <td style={{padding:"10px 16px",whiteSpace:"nowrap",borderBottom:`1px solid ${C.b}`}}>
                        <div style={{fontWeight:700,fontSize:12,color:C.t1}}>{client}</div>
                        <div style={{display:"flex",alignItems:"center",gap:6,marginTop:3}}>
                          <div style={{height:3,width:50,background:"#F1F5F9",borderRadius:99}}>
                            <div style={{height:"100%",width:`${Math.min(100,tf)}%`,background:tf>=80?C.green:tf>=50?C.teal:C.amber,borderRadius:99}}/>
                          </div>
                          <span style={{fontSize:10,color:tf>=80?C.greenDk:tf>=50?C.teal:C.amberDk,fontWeight:600}}>{tf.toFixed(0)}%</span>
                        </div>
                      </td>
                      {monthly.map((m:any,mi:number)=>{
                        const hasPO=m.po>0;const hasInv=m.inv>0;
                        const barH=hasPO?(m.po/maxMonth*18):0;
                        const invH=hasInv?(m.inv/maxMonth*18):0;
                        return(
                          <td key={mi} style={{padding:"6px",textAlign:"center",borderBottom:`1px solid ${C.b}`,verticalAlign:"bottom"}}>
                            <div style={{display:"flex",gap:2,alignItems:"flex-end",justifyContent:"center",height:20,marginBottom:3}}>
                              {hasPO&&<div title={`PO: ${fmt(m.po)} €`} style={{width:7,height:Math.max(2,barH),background:C.blue,borderRadius:"2px 2px 0 0",opacity:.7}}/>}
                              {hasInv&&<div title={`Facturé: ${fmt(m.inv)} €`} style={{width:7,height:Math.max(2,invH),background:C.teal,borderRadius:"2px 2px 0 0"}}/>}
                            </div>
                            {hasPO&&<div style={{fontSize:9,color:C.blue,fontWeight:hasPO?600:400,lineHeight:1.2}}>{fmtK(m.po)}</div>}
                            {hasInv&&<div style={{fontSize:9,color:C.teal,lineHeight:1.2}}>{fmtK(m.inv)}</div>}
                            {!hasPO&&!hasInv&&<div style={{fontSize:9,color:"#E2E8F0"}}>—</div>}
                          </td>
                        );
                      })}
                      <td style={{padding:"10px 14px",textAlign:"right",fontWeight:700,color:C.blue,background:C.blueL,borderBottom:`1px solid ${C.b}`,whiteSpace:"nowrap"}}>{fmtK(totalPO)} €</td>
                      <td style={{padding:"10px 14px",textAlign:"right",fontWeight:700,color:C.teal,background:C.tealL,borderBottom:`1px solid ${C.b}`,whiteSpace:"nowrap"}}>{fmtK(totalInv)} €</td>
                      <td style={{padding:"10px 14px",textAlign:"right",fontWeight:700,color:openOrders>0?C.amberDk:C.t3,background:openOrders>0?C.amberL:"#F8FAFC",borderBottom:`1px solid ${C.b}`,whiteSpace:"nowrap"}}>{openOrders>0?`${fmtK(openOrders)} €`:"—"}</td>
                    </tr>
                  );
                })}
                {/* Total row */}
                <tr style={{background:C.side}}>
                  <td style={{padding:"12px 16px",fontWeight:700,color:"#F1F5F9",fontSize:12}}>TOTAL {selYear}</td>
                  {MONTHS.map((_,mi)=>{
                    const mpo=all.reduce((s:number,c:any)=>s+c.monthly[mi].po,0);
                    const minv=all.reduce((s:number,c:any)=>s+c.monthly[mi].inv,0);
                    return(
                      <td key={mi} style={{padding:"8px 6px",textAlign:"center",verticalAlign:"middle"}}>
                        {mpo>0&&<div style={{fontSize:9,color:"#93C5FD",fontWeight:600,lineHeight:1.3}}>{fmtK(mpo)}</div>}
                        {minv>0&&<div style={{fontSize:9,color:"#5EEAD4",lineHeight:1.3}}>{fmtK(minv)}</div>}
                        {!mpo&&!minv&&<div style={{fontSize:9,color:"#374151"}}>—</div>}
                      </td>
                    );
                  })}
                  <td style={{padding:"12px 14px",textAlign:"right",background:"#1D4ED8",color:"#BFDBFE",fontWeight:800,fontSize:13}}>{fmtK(totPO)} €</td>
                  <td style={{padding:"12px 14px",textAlign:"right",background:"#0F766E",color:"#99F6E4",fontWeight:800,fontSize:13}}>{fmtK(totInv)} €</td>
                  <td style={{padding:"12px 14px",textAlign:"right",background:"#B45309",color:"#FDE68A",fontWeight:800,fontSize:13}}>{fmtK(totOpen)} €</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── OPEN ORDERS FOOTER ── */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:16}}>
        <div style={{display:"flex",gap:10}}>
          <div style={{background:"#fff",boxShadow:C.sh,borderRadius:C.r,padding:"10px 18px",border:`1px solid ${C.b}`,textAlign:"center"}}>
            <div style={{fontSize:10,color:C.t3,fontWeight:600,textTransform:"uppercase",letterSpacing:".05em",marginBottom:2}}>Taux facturation</div>
            <div style={{fontSize:18,fontWeight:800,color:txFact>=80?C.greenDk:txFact>=50?C.amberDk:C.redDk}}>{txFact.toFixed(1)}%</div>
          </div>
          <div style={{background:"#fff",boxShadow:C.sh,borderRadius:C.r,padding:"10px 18px",border:`1px solid ${C.b}`,textAlign:"center"}}>
            <div style={{fontSize:10,color:C.t3,fontWeight:600,textTransform:"uppercase",letterSpacing:".05em",marginBottom:2}}>Taux encaissement</div>
            <div style={{fontSize:18,fontWeight:800,color:txPay>=80?C.greenDk:txPay>=50?C.amberDk:C.redDk}}>{txPay.toFixed(1)}%</div>
          </div>
        </div>
        <div style={{background:`linear-gradient(135deg,${C.amberDk},#F59E0B)`,boxShadow:"0 6px 24px rgba(217,119,6,.3)",borderRadius:C.rLg,padding:"16px 32px",display:"flex",alignItems:"center",gap:20}}>
          <div>
            <div style={{fontSize:10,color:"rgba(255,255,255,.75)",fontWeight:600,textTransform:"uppercase",letterSpacing:".08em",marginBottom:2}}>Open Orders {selYear}</div>
            <div style={{fontSize:28,fontWeight:900,color:"#fff",letterSpacing:"-.03em"}}>{fmt(totOpen)} €</div>
          </div>
          <i className="ti ti-arrow-right" style={{fontSize:20,color:"rgba(255,255,255,.6)"}} aria-hidden="true"/>
        </div>
      </div>

    </div>
  );
}

// ─── CLIENT PAGE ─────────────────────────────────────────────────────────────
function CustomerPage({client,cfg,orders,stats,onAdd,onEditOrder,onDelOrder,onAddInv,onEditInv,onDelInv,onAddPay,onEditPay,onDelPay,onEditCustomer,onDelCustomer,focusOrderId,onClearFocus,lang="fr",isMobile=false,onSaveOrder}:any){
  const tr=(k:string,v?:any)=>t(lang as Lang,k,v);
  const[exp,setExp]=useState<Record<string,boolean>>({});
  const tgl=(id:string)=>setExp(p=>({...p,[id]:!p[id]}));
  // Auto-expand focused order on navigation from search
  useEffect(()=>{
    if(focusOrderId){
      setExp(p=>({...p,[focusOrderId]:true}));
      setTimeout(()=>{
        const el=document.getElementById(`order-${focusOrderId}`);
        if(el)el.scrollIntoView({behavior:"smooth",block:"center"});
      },120);
    }
  },[focusOrderId]);
  const term=PAY_TERMS.find(t=>t.id===cfg.termId)||PAY_TERMS[5];
  const txFact=stats.totalPO>0?(stats.totalInv/stats.totalPO*100):0;
  const txPay=stats.totalInv>0?(stats.totalPaid/stats.totalInv*100):0;
  const lateOrders=orders.filter((o:any)=>{if(!o.expectedDate||o.status==="annule")return false;const exp=new Date(o.expectedDate+"T00:00:00"),t=new Date();t.setHours(0,0,0,0);const inv=(o.invoices||[]).reduce((s:number,i:any)=>s+(+i.amount||0),0);return exp<t&&inv<(+o.amount||0)*0.99;});
  const overduePayments=orders.reduce((s:any[],o:any)=>s.concat((o.invoices||[]).filter((i:any)=>["overdue","ov_part","today","soon"].includes(payStatus(i).key)).map((i:any)=>({...i,_po:o.poNumber}))),[]);
  return(
    <>
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
            <h1 style={{margin:0,fontSize:22,fontWeight:700,color:C.t1}}>{client}</h1>
            {cfg.accountNumber&&<span style={{background:C.blueL,color:C.blueDk,padding:"3px 10px",borderRadius:5,fontSize:12,fontWeight:600,fontFamily:"monospace"}}>{cfg.accountNumber}</span>}
            <span style={{background:C.purpleL,color:C.purple,padding:"3px 10px",borderRadius:5,fontSize:11,fontWeight:600}}>{term.label}</span>
          </div>
          <p style={{margin:0,color:C.t3,fontSize:13}}>Gestion des commandes 2026</p>
          {(lateOrders.length>0||overduePayments.length>0)&&<div style={{display:"flex",gap:8,marginTop:6,flexWrap:"wrap"}}>
            {lateOrders.length>0&&<span style={{background:C.redL,color:C.redDk,fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:4,display:"flex",alignItems:"center",gap:4}}><i className="ti ti-truck-off" style={{fontSize:13}} aria-hidden="true"/> {lateOrders.length} livraison{lateOrders.length>1?"s":""} en retard</span>}
            {overduePayments.length>0&&<span style={{background:C.amberL,color:C.amberDk,fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:4,display:"flex",alignItems:"center",gap:4}}><i className="ti ti-clock-exclamation" style={{fontSize:13}} aria-hidden="true"/> {overduePayments.length} paiement{overduePayments.length>1?"s":""} à surveiller</span>}
          </div>}
        </div>
        <div style={{display:"flex",gap:8}}>
          <Btn icon="ti-edit" label="Modifier" onClick={onEditCustomer} variant="ghost"/>
          <Btn icon="ti-trash" label="Supprimer" onClick={onDelCustomer} variant="danger"/>
          <Btn icon="ti-plus" label={tr("btn_new_order")} onClick={onAdd} variant="primary"/>
        </div>
      </div>

      {/* KPIs */}
      {/* Compute per-client echues / en cours */}
      {(()=>{
        const allInv=orders.flatMap((o:any)=>(o.invoices||[]).map((i:any)=>({...i,_oid:o.id})));
        const clientEchues=allInv.filter((i:any)=>["overdue","ov_part"].includes(payStatus(i).key));
        const clientEnCours=allInv.filter((i:any)=>["pending","partial","ok","today","soon","soon_part"].includes(payStatus(i).key));
        const echuesAmt=clientEchues.reduce((s:number,i:any)=>s+payStatus(i).rem,0);
        const enCoursAmt=clientEnCours.reduce((s:number,i:any)=>s+payStatus(i).rem,0);
        return(
          <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(6,1fr)",gap:isMobile?8:12}}>
            <Kpi icon="ti-file-invoice"    label="PO total"           val={`${fmtK(stats.totalPO)} €`}    sub="Commandé"                                   c={C.blue}   bg={C.blueL}/>
            <Kpi icon="ti-receipt"         label="Facturé"            val={`${fmtK(stats.totalInv)} €`}   sub={`${txFact.toFixed(1)}% du PO`}              c={C.teal}   bg={C.tealL}/>
            <Kpi icon="ti-coin"            label="Encaissé"           val={`${fmtK(stats.totalPaid)} €`}  sub={`${txPay.toFixed(1)}% des factures`}         c={C.green}  bg={C.greenL}/>
            <Kpi icon="ti-clock-exclamation" label="Factures échues"  val={echuesAmt>0?`${fmtK(echuesAmt)} €`:"—"}  sub={`${clientEchues.length} facture${clientEchues.length>1?"s":""} en retard`}  c={echuesAmt>0?C.redDk:C.t3}   bg={echuesAmt>0?C.redL:"#F8FAFC"}/>
            <Kpi icon="ti-hourglass"       label="En cours (non échu)" val={enCoursAmt>0?`${fmtK(enCoursAmt)} €`:"—"} sub={`${clientEnCours.length} facture${clientEnCours.length>1?"s":""} en attente`} c={enCoursAmt>0?C.amberDk:C.t3} bg={enCoursAmt>0?C.amberL:"#F8FAFC"}/>
            <Kpi icon="ti-clock"           label="Open orders"        val={`${fmtK(stats.openOrders)} €`} sub="Remaining to invoice"                            c={C.purple} bg={C.purpleL}/>
          </div>
        );
      })()}


      {/* Tableau mensuel */}
      <Card noPad>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
          <thead><tr style={{background:"#F8FAFC",borderBottom:`1px solid ${C.b}`}}>
            <th style={{padding:"8px 16px",textAlign:"left",color:C.t3,fontWeight:500,width:80}}/>
            {MONTHS.map(m=><th key={m} style={{padding:"8px 5px",textAlign:"center",color:C.t3,fontWeight:500,minWidth:52}}>{m}</th>)}
          </tr></thead>
          <tbody>
            {[{label:"PO",key:"po",c:C.blue},{label:"Facturé",key:"inv",c:C.teal},{label:"Encaissé",key:"paid",c:C.green}].map((row,ri)=>(
              <tr key={row.key} style={{background:ri%2===0?"#fff":"#FAFBFD"}}>
                <td style={{padding:"7px 16px",fontWeight:600,color:row.c,fontSize:11}}>{row.label}</td>
                {stats.monthly.map((m:any,i:number)=><td key={i} style={{padding:"7px 5px",textAlign:"center",color:(m as any)[row.key]>0?row.c:"#E2E8F0",fontWeight:(m as any)[row.key]>0?500:400}}>{(m as any)[row.key]>0?fmt((m as any)[row.key]):"—"}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Commandes */}
      <OrderTabsPanel client={client} orders={orders} exp={exp} tgl={tgl}
        onAddInv={onAddInv} onEditOrder={onEditOrder} onDelOrder={onDelOrder}
        onAddPay={onAddPay} onEditPay={onEditPay} onDelPay={onDelPay}
        onEditInv={onEditInv} onDelInv={onDelInv}
        focusOrderId={focusOrderId} onClearFocus={onClearFocus} onAdd={onAdd} lang={lang}
        onSaveOrder={onSaveOrder}
      />
    </div>
    {/* Floating action button — always accessible */}
    <div style={{position:"fixed",bottom:28,right:28,zIndex:40,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:8}}>
      <button onClick={onAdd} title="Nouvelle commande" style={{width:52,height:52,borderRadius:99,background:`linear-gradient(135deg,${C.blue},${C.purple})`,border:"none",color:"#fff",fontSize:22,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",boxShadow:"0 4px 20px rgba(37,99,235,.45)",transition:"transform .15s"}} onMouseEnter={(e:any)=>e.currentTarget.style.transform="scale(1.1)"} onMouseLeave={(e:any)=>e.currentTarget.style.transform="scale(1)"}>
        <i className="ti ti-plus" aria-hidden="true"/>
      </button>
    </div>
    </>
  );
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function SBtn({icon,label,active,open,onClick}:any){
  return(
    <button onClick={onClick} style={{display:"flex",alignItems:"center",gap:9,width:"100%",padding:open?"8px 10px":"8px",background:active?"rgba(99,102,241,.18)":"transparent",border:"none",borderRadius:7,color:active?"#A5B4FC":"#6B7280",cursor:"pointer",textAlign:"left",fontSize:13,justifyContent:open?"flex-start":"center",transition:"background .15s"}}>
      <i className={`ti ${icon}`} style={{fontSize:16,flexShrink:0}} aria-hidden="true"/>
      {open&&<span style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",fontWeight:active?600:400}}>{label}</span>}
    </button>
  );
}
function SCustomerBtn({label,active,open,onClick,onEdit,onDelete}:any){
  const[hov,setHov]=useState(false);
  return(
    <div style={{display:"flex",alignItems:"center",borderRadius:7,background:active?"rgba(99,102,241,.18)":hov?"rgba(255,255,255,.04)":"transparent",transition:"background .15s"}}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
      <button onClick={onClick} style={{display:"flex",alignItems:"center",gap:9,flex:1,padding:open?"8px 10px":"8px",background:"transparent",border:"none",color:active?"#A5B4FC":"#6B7280",cursor:"pointer",textAlign:"left",fontSize:13,justifyContent:open?"flex-start":"center",fontWeight:active?600:400,minWidth:0}}>
        <i className="ti ti-building-store" style={{fontSize:16,flexShrink:0}} aria-hidden="true"/>
        {open&&<span style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{label}</span>}
      </button>
      {open&&hov&&<div style={{display:"flex",gap:2,paddingRight:8,flexShrink:0}}>
        <button onClick={(e:any)=>{e.stopPropagation();onEdit();}} style={{background:"transparent",border:"none",color:"#4B5563",cursor:"pointer",padding:4,borderRadius:4}}><i className="ti ti-edit" style={{fontSize:12}} aria-hidden="true"/></button>
        <button onClick={(e:any)=>{e.stopPropagation();onDelete();}} style={{background:"transparent",border:"none",color:"#EF4444",cursor:"pointer",padding:4,borderRadius:4}}><i className="ti ti-trash" style={{fontSize:12}} aria-hidden="true"/></button>
      </div>}
    </div>
  );
}

function Kpi({icon,label,val,sub,c,bg}:any){
  return(
    <div style={{background:"#fff",borderRadius:C.r,boxShadow:C.sh,padding:"16px 18px",border:`1px solid ${C.b}`}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <span style={{fontSize:11,color:C.t3,fontWeight:500,textTransform:"uppercase",letterSpacing:".05em"}}>{label}</span>
        <div style={{width:30,height:30,borderRadius:8,background:bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <i className={`ti ${icon}`} style={{fontSize:15,color:c}} aria-hidden="true"/>
        </div>
      </div>
      <div style={{fontSize:18,fontWeight:700,color:C.t1,marginBottom:3}}>{val}</div>
      <div style={{fontSize:11,color:C.t3}}>{sub}</div>
    </div>
  );
}

function Card({title,icon,children,noPad,badge}:any){
  return(
    <div style={{background:"#fff",borderRadius:C.rLg,boxShadow:C.sh,border:`1px solid ${C.b}`,overflow:"hidden"}}>
      {title&&(
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"14px 18px",borderBottom:`1px solid ${C.b}`}}>
          <i className={`ti ${icon}`} style={{fontSize:16,color:C.t2}} aria-hidden="true"/>
          <span style={{fontWeight:600,fontSize:13,color:C.t1,flex:1}}>{title}</span>
          {badge&&<span style={{background:badge.color+"20",color:badge.color,fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:99}}>{badge.n}</span>}
        </div>
      )}
      <div style={{padding:noPad?0:18}}>{children}</div>
    </div>
  );
}

function Track({val,max,color,h,label}:any){
  return(
    <div style={{position:"relative"}}>
      <div style={{height:h,background:"#F1F5F9",borderRadius:99,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${Math.min(100,val/max*100)}%`,background:color,borderRadius:99,transition:"width .4s"}}/>
      </div>
      {label&&<span style={{position:"absolute",right:0,top:-(h+2),fontSize:9,color:color,fontWeight:600}}>{label}</span>}
    </div>
  );
}

function Alert({icon,text,color,bg}:any){
  return(
    <div style={{display:"flex",gap:8,alignItems:"center",background:bg,border:`1px solid ${color}20`,borderRadius:C.rSm,padding:"8px 12px"}}>
      <i className={`ti ${icon}`} style={{color,fontSize:14}} aria-hidden="true"/>
      <span style={{fontSize:12,color,fontWeight:500}}>{text}</span>
    </div>
  );
}

function Tag({label,c,bg,sm}:any){
  return<span style={{fontSize:sm?10:11,background:bg,color:c,padding:sm?"1px 6px":"3px 9px",borderRadius:4,whiteSpace:"nowrap",fontWeight:600,display:"inline-block"}}>{label}</span>;
}

function IBtn({icon,title,c,bg,onClick,small}:any){
  return<button title={title} onClick={onClick} style={{background:bg,color:c,border:"none",borderRadius:small?4:C.rSm,width:small?22:28,height:small?22:28,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:small?11:13,flexShrink:0}}><i className={`ti ${icon}`} aria-hidden="true"/></button>;
}

function Btn({icon,label,onClick,variant,small}:any){
  const styles:any={
    primary:{bg:C.blue,c:"#fff",border:"none"},
    ghost:{bg:"transparent",c:C.t2,border:`1px solid ${C.b}`},
    danger:{bg:C.redL,c:C.redDk,border:`1px solid ${C.red}30`},
    success:{bg:C.greenL,c:C.greenDk,border:"none"},
  };
  const s=styles[variant]||styles.ghost;
  return<button onClick={onClick} style={{display:"flex",alignItems:"center",gap:5,background:s.bg,color:s.c,border:s.border,borderRadius:C.rSm,padding:small?"6px 11px":"8px 14px",fontSize:small?11:12,fontWeight:600,cursor:"pointer",transition:"opacity .15s",whiteSpace:"nowrap"}} onMouseEnter={(e:any)=>e.currentTarget.style.opacity=".85"} onMouseLeave={(e:any)=>e.currentTarget.style.opacity="1"}>
    <i className={`ti ${icon}`} style={{fontSize:small?12:14}} aria-hidden="true"/>{label}
  </button>;
}

function Label({t}:any){return<label style={{fontSize:11,color:C.t3,fontWeight:600,display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:".05em"}}>{t}</label>;}

// ─── MODALS ──────────────────────────────────────────────────────────────────
function Modal({title,sub,width,children,footer,onClose}:any){
  return(
    <div style={{background:"#fff",borderRadius:window.innerWidth<768?`${C.rLg} ${C.rLg} 0 0`:C.rLg,width:window.innerWidth<768?"100vw":(width||480),maxWidth:window.innerWidth<768?"100vw":"94vw",boxShadow:C.shMd,border:`1px solid ${C.b}`,display:"flex",flexDirection:"column",maxHeight:window.innerWidth<768?"90vh":"92vh",marginTop:window.innerWidth<768?"auto":undefined}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 22px",borderBottom:`1px solid ${C.b}`,flexShrink:0}}>
        <div><h3 style={{margin:0,fontSize:16,fontWeight:700,color:C.t1}}>{title}</h3>{sub&&<p style={{margin:"3px 0 0",fontSize:12,color:C.t3}}>{sub}</p>}</div>
        <button onClick={onClose} style={{background:"#F1F5F9",border:"none",color:C.t3,cursor:"pointer",borderRadius:6,width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center"}}><i className="ti ti-x" style={{fontSize:15}} aria-hidden="true"/></button>
      </div>
      <div style={{padding:"20px 22px",overflowY:"auto",flex:1}}>{children}</div>
      {footer&&<div style={{display:"flex",justifyContent:"flex-end",gap:8,padding:"14px 22px",borderTop:`1px solid ${C.b}`,background:"#FAFBFD",borderRadius:`0 0 ${C.rLg} ${C.rLg}`,flexShrink:0}}>{footer}</div>}
    </div>
  );
}

function Fld({label,type="text",value,onChange,placeholder,span,rows}:any){
  return(
    <div style={{gridColumn:span?`span ${span}`:undefined}}>
      <Label t={label}/>
      {rows
        ?<textarea value={value} onChange={(e:any)=>onChange(e.target.value)} placeholder={placeholder} rows={rows} style={{width:"100%",resize:"vertical",boxSizing:"border-box",fontFamily:"inherit",padding:"8px 10px",border:`1px solid ${C.b}`,borderRadius:C.rSm,fontSize:13,color:C.t1,outline:"none"}}/>
        :<input type={type} value={value} onChange={(e:any)=>onChange(e.target.value)} placeholder={placeholder} style={{width:"100%",boxSizing:"border-box"}}/>
      }
    </div>
  );
}

function Sel({label,value,onChange,options,span}:any){
  return(
    <div style={{gridColumn:span?`span ${span}`:undefined}}>
      <Label t={label}/>
      <select value={value} onChange={(e:any)=>onChange(e.target.value)} style={{width:"100%"}}>
        {options.map((o:any)=><option key={o.value||o} value={o.value||o}>{o.label||o}</option>)}
      </select>
    </div>
  );
}

function CustomerModal({name,cfg,onSave,onClose,lang="fr"}:any){
  const tr=(k:string,v?:any)=>t(lang as Lang,k,v);
  const[nm,setNm]=useState(name||"");
  const[acc,setAcc]=useState(cfg?.accountNumber||"");
  const[termId,setTermId]=useState(cfg?.termId||"net60");
  const[customDays,setCustomDays]=useState(cfg?.customDays||0);
  const isEdit=!!name;
  const save=()=>onSave(nm,{accountNumber:acc,termId,customDays:+customDays});
  return(
    <Modal title={isEdit?tr("edit_client_title"):tr("new_client")} sub={isEdit?name:undefined} onClose={onClose}
      footer={<><button onClick={onClose}>{tr("cancel")}</button><Btn icon={isEdit?"ti-check":"ti-plus"} label={isEdit?tr("save_changes"):tr("create_client")} onClick={save} variant="primary"/></>}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Fld label="Nom du client *" value={nm} onChange={setNm} placeholder="ex: SODIGAZ" span={2}/>
        <Fld label="N° de compte" value={acc} onChange={setAcc} placeholder="ex: 7310000042"/>
        <Sel label="Conditions de paiement" value={termId} onChange={setTermId} options={PAY_TERMS.map(t=>({value:t.id,label:t.label}))}/>
        {termId==="custom"&&<Fld label="Délai en jours" type="number" value={customDays} onChange={setCustomDays} placeholder="ex: 75" span={2}/>}
      </div>
      {termId!=="custom"&&(
        <div style={{marginTop:14,background:C.blueL,borderRadius:C.rSm,padding:"10px 14px",fontSize:12,color:C.blueDk}}>
          <i className="ti ti-info-circle" style={{marginRight:6}} aria-hidden="true"/>
          <strong>Échéances automatiques :</strong> {PAY_TERMS.find(t=>t.id===termId)?.advance?"Paiement lié à la livraison — la date de facture sera utilisée comme date d'échéance.":termId==="comptant"?"Paiement comptant — la facture est due le jour de son édition.":`La date d'échéance sera calculée automatiquement (${PAY_TERMS.find(t=>t.id===termId)?.days} jours après la date de facture).`}
        </div>
      )}
    </Modal>
  );
}

function OrderModal({client,order,onSave,onClose,lang="fr"}:any){
  const tr=(k:string,v?:any)=>t(lang as Lang,k,v);
  const isCimelec=client==="CIMELEC";
  const[f,setF]=useState({date:order?.date||todayStr(),poNumber:order?.poNumber||"",soNumber:order?.soNumber||"",orderNumber:order?.orderNumber||"",amount:order?.amount||"",status:order?.status||"attente_fdi",deliveryMode:order?.deliveryMode||"Transitaire FCA",expectedDate:order?.expectedDate||"",notes:order?.notes||"",id:order?.id});
  const s=(k:string,v:any)=>setF(p=>({...p,[k]:v}));
  return(
    <Modal title={order?tr("edit_order"):tr("new_order")} sub={client} width={560} onClose={onClose}
      footer={<><button onClick={onClose}>{tr("cancel")}</button><Btn icon="ti-check" label={order?tr("save_order"):tr("create_order")} onClick={()=>{if(!f.poNumber||!f.amount){alert("PO # et montant requis");return;}onSave(f);}} variant="primary"/></>}>
      {/* Infos de base */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        <Fld label="Date commande *" type="date" value={f.date} onChange={(v:any)=>s("date",v)}/>
        <Fld label="PO # Customer *" value={f.poNumber} onChange={(v:any)=>s("poNumber",v)} placeholder="ex: T526.2026"/>
        <Fld label="S/O # *" value={f.soNumber} onChange={(v:any)=>s("soNumber",v)} placeholder="ex: 14560128"/>
        {isCimelec
          ?<Fld label="N° Commande (CIMELEC)" value={f.orderNumber} onChange={(v:any)=>s("orderNumber",v)} placeholder="ex: CMD-2026-001"/>
          :<Fld label="Montant (€) *" type="number" value={f.amount} onChange={(v:any)=>s("amount",v)} placeholder="0.00"/>
        }
        {isCimelec&&<Fld label="Montant (€) *" type="number" value={f.amount} onChange={(v:any)=>s("amount",v)} placeholder="0.00" span={2}/>}
        <Sel label="Mode de livraison" value={f.deliveryMode} onChange={(v:any)=>s("deliveryMode",v)} options={DELIVERY_MODES}/>
        <Fld label="Date livraison prévue" type="date" value={f.expectedDate} onChange={(v:any)=>s("expectedDate",v)}/>
        <Fld label="Notes" value={f.notes} onChange={(v:any)=>s("notes",v)} placeholder="Remarques…" span={2} rows={2}/>
      </div>
      {/* Sélecteur de statut visuel */}
      <div style={{marginBottom:4}}>
        <Label t={tr("order_status_title")}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:6}}>
          {ORDER_STATUSES.map(st=>{ const stMeta=getStatusMeta(st.id,lang as Lang);
            const sel=f.status===st.id;
            const sty=SS[st.id]||{c:C.t2,bg:"#F1F5F9"};
            return(
              <button key={st.id} type="button" onClick={()=>s("status",st.id)}
                style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 12px",borderRadius:C.r,
                  border:`2px solid ${sel?sty.c:C.b}`,
                  background:sel?sty.bg+"CC":"#fff",
                  cursor:"pointer",textAlign:"left",transition:"all .15s",
                  boxShadow:sel?`0 0 0 3px ${sty.c}20`:"none"}}>
                <div style={{width:28,height:28,borderRadius:7,background:sel?sty.c:C.b,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                  <i className={`ti ${st.icon}`} style={{fontSize:14,color:sel?"#fff":C.t3}} aria-hidden="true"/>
                </div>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:sel?700:500,color:sel?sty.c:C.t1,display:"flex",alignItems:"center",gap:5}}>
                    {stMeta.label||st.label}
                    {st.alert&&<span style={{width:6,height:6,borderRadius:99,background:C.red,display:"inline-block",flexShrink:0}}/>}
                  </div>
                  <div style={{fontSize:10,color:C.t3,marginTop:2,lineHeight:1.3}}>{st.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}

function InvoiceModal({client,order,invoice,cfg,onSave,onClose,lang="fr"}:any){
  const tr=(k:string,v?:any)=>t(lang as Lang,k,v);
  const term=PAY_TERMS.find(t=>t.id===(cfg?.termId||"net60"))||PAY_TERMS[5];
  const autoDate=(d:string)=>calcDueDate(d,cfg?.termId||"net60",cfg?.customDays||0);
  const[f,setF]=useState({invoiceNumber:invoice?.invoiceNumber||"",date:invoice?.date||todayStr(),amount:invoice?.amount||"",shippingMode:invoice?.shippingMode||"Transitaire FCA",dueDate:invoice?.dueDate||autoDate(invoice?.date||todayStr()),overrideDueDate:!!invoice?.dueDate,notes:invoice?.notes||"",id:invoice?.id,payments:invoice?.payments||[]});
  const s=(k:string,v:any)=>setF(p=>({...p,[k]:v}));
  const already=(order.invoices||[]).filter((i:any)=>i.id!==invoice?.id).reduce((ss:number,i:any)=>ss+(+i.amount||0),0);
  const remaining=Math.max(0,(+order.amount||0)-already);
  return(
    <Modal title={invoice?tr("edit_invoice"):tr("new_invoice")} sub={`Commande : ${order.poNumber}`} width={520} onClose={onClose}
      footer={<><button onClick={onClose}>{tr("cancel")}</button><Btn icon="ti-check" label={invoice?tr("save_invoice"):tr("create_invoice")} onClick={()=>{if(!f.invoiceNumber||!f.amount){alert("Invoice # et montant requis");return;}const dd=f.overrideDueDate?f.dueDate:autoDate(f.date);onSave({...f,dueDate:dd});}} variant="primary"/></>}>
      <div style={{display:"flex",gap:14,background:C.blueL,borderRadius:C.rSm,padding:"10px 14px",marginBottom:16,fontSize:12}}>
        <span style={{color:C.blueDk}}>PO : <strong>{fmt(order.amount)} €</strong></span>
        <span style={{color:C.teal}}>Déjà facturé : <strong>{fmt(already)} €</strong></span>
        <span style={{color:C.amberDk}}>Reste : <strong>{fmt(remaining)} €</strong></span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Fld label="Invoice # *" value={f.invoiceNumber} onChange={(v:any)=>s("invoiceNumber",v)} placeholder="ex: INV-2026-001"/>
        <Fld label="Date facture *" type="date" value={f.date} onChange={(v:any)=>{s("date",v);if(!f.overrideDueDate)s("dueDate",autoDate(v));}}/>
        <Fld label="Montant (€) *" type="number" value={f.amount} onChange={(v:any)=>s("amount",v)} placeholder="0.00"/>
        <Sel label="Mode expédition" value={f.shippingMode} onChange={(v:any)=>s("shippingMode",v)} options={DELIVERY_MODES}/>
        <div style={{gridColumn:"span 2"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
            <Label t="Date d'échéance paiement"/>
            <label style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:C.t3,cursor:"pointer"}}>
              <input type="checkbox" checked={f.overrideDueDate} onChange={e=>s("overrideDueDate",e.target.checked)}/>
              Forcer manuellement
            </label>
          </div>
          {f.overrideDueDate
            ?<input type="date" value={f.dueDate} onChange={(e:any)=>s("dueDate",e.target.value)} style={{width:"100%",boxSizing:"border-box"}}/>
            :<div style={{display:"flex",alignItems:"center",gap:8,background:"#F8FAFC",border:`1px solid ${C.b}`,borderRadius:C.rSm,padding:"8px 12px"}}>
              <i className="ti ti-calendar-check" style={{color:C.blue,fontSize:14}} aria-hidden="true"/>
              <span style={{fontSize:13,color:C.t1,fontWeight:500}}>{fmtD(f.dueDate)}</span>
              <span style={{fontSize:11,color:C.t3,marginLeft:"auto"}}>Calculé · {term.label}</span>
            </div>
          }
        </div>
        <Fld label="Notes" value={f.notes} onChange={(v:any)=>s("notes",v)} placeholder="Détails de l'expédition…" span={2} rows={2}/>
      </div>
    </Modal>
  );
}

function PaymentModal({invoice,payment,onSave,onClose,lang="fr"}:any){
  const tr=(k:string,v?:any)=>t(lang as Lang,k,v);
  const ps=payStatus(invoice);
  const[f,setF]=useState({date:payment?.date||todayStr(),amount:payment?.amount||ps.rem||"",method:payment?.method||"Virement bancaire",reference:payment?.reference||"",notes:payment?.notes||"",id:payment?.id});
  const s=(k:string,v:any)=>setF(p=>({...p,[k]:v}));
  return(
    <Modal title={payment?tr("edit_payment"):tr("record_payment")} sub={`Facture : ${invoice.invoiceNumber}`} onClose={onClose}
      footer={<><button onClick={onClose}>{tr("cancel")}</button><Btn icon="ti-coin" label={payment?tr("save"):tr("validate_payment")} onClick={()=>{if(!f.amount){alert("Montant requis");return;}onSave(f);}} variant="success"/></>}>
      <div style={{display:"flex",gap:14,background:C.greenL,borderRadius:C.rSm,padding:"10px 14px",marginBottom:16,fontSize:12}}>
        <span style={{color:C.greenDk}}>Facture : <strong>{fmt(invoice.amount)} €</strong></span>
        <span style={{color:C.green}}>Déjà payé : <strong>{fmt(ps.paid)} €</strong></span>
        <span style={{color:ps.rem>0?C.amberDk:C.greenDk,fontWeight:700}}>Reste : {fmt(ps.rem)} €</span>
      </div>
      {invoice.dueDate&&(
        <div style={{background:ps.key.startsWith("over")?C.redL:ps.key==="today"?C.amberL:C.blueL,borderRadius:C.rSm,padding:"8px 14px",marginBottom:14,fontSize:12,color:ps.color,fontWeight:600,display:"flex",alignItems:"center",gap:8}}>
          <i className="ti ti-calendar" style={{fontSize:14}} aria-hidden="true"/>
          Échéance : {fmtD(invoice.dueDate)} · {ps.label}
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Fld label="Date du paiement *" type="date" value={f.date} onChange={(v:any)=>s("date",v)}/>
        <Fld label="Montant reçu (€) *" type="number" value={f.amount} onChange={(v:any)=>s("amount",v)} placeholder="0.00"/>
        <Sel label="Mode de paiement" value={f.method} onChange={(v:any)=>s("method",v)} options={PAY_METHODS}/>
        <Fld label="Référence / N° virement" value={f.reference} onChange={(v:any)=>s("reference",v)} placeholder="ex: VIR-2026-042"/>
        <Fld label="Notes" value={f.notes} onChange={(v:any)=>s("notes",v)} placeholder="Observations…" span={2} rows={2}/>
      </div>
    </Modal>
  );
}

// ─── ORDER TABS PANEL ────────────────────────────────────────────────────────
function OrderTabsPanel({client,orders,exp,tgl,onAddInv,onEditOrder,onDelOrder,onAddPay,onEditPay,onDelPay,onEditInv,onDelInv,focusOrderId,onClearFocus,onAdd,lang="fr",onSaveOrder}:any){
  const tr=(k:string,v?:any)=>t(lang as Lang,k,v);
  const[tab,setTab]=useState<"orders"|"invoices"|"payments">("orders");
  const[search,setSearch]=useState("");
  const[showAll,setShowAll]=useState(false);
  const DEFAULT_SHOWN=4;

  // ── flat lists ──
  const sorted=[...orders].sort((a:any,b:any)=>new Date(b.date||"1970").getTime()-new Date(a.date||"1970").getTime());
  const allInvoices=sorted.flatMap((o:any)=>(o.invoices||[]).map((i:any)=>({...i,_order:o,_po:o.poNumber,_oid:o.id})))
    .sort((a:any,b:any)=>new Date(b.date||"1970").getTime()-new Date(a.date||"1970").getTime());
  const allPayments=allInvoices.flatMap((i:any)=>(i.payments||[]).map((p:any)=>({...p,_inv:i,_po:i._po,_invNum:i.invoiceNumber,_oid:i._oid})))
    .sort((a:any,b:any)=>new Date(b.date||"1970").getTime()-new Date(a.date||"1970").getTime());

  // ── counts ──
  const nbOrders=sorted.length;
  const nbInvoices=allInvoices.length;
  const nbPayments=allPayments.length;
  const nbEchues=allInvoices.filter((i:any)=>["overdue","ov_part"].includes(payStatus(i).key)).length;

  // ── search filter ──
  const sq=search.trim().toLowerCase();
  const filterOrders=sorted.filter(o=>!sq||[o.poNumber,o.soNumber,o.orderNumber,o.status,o.notes].some((v:any)=>String(v||"").toLowerCase().includes(sq)));
  const filterInvoices=allInvoices.filter(i=>!sq||[i.invoiceNumber,i._po,(i as any).orderNumber,i.notes].some((v:any)=>String(v||"").toLowerCase().includes(sq)));
  const filterPayments=allPayments.filter(p=>!sq||[p.reference,p._po,p._invNum,p.method,p.notes].some((v:any)=>String(v||"").toLowerCase().includes(sq)));

  const TABS=[
    {key:"orders",   label:tr("tab_orders"),   icon:"ti-clipboard-list",  count:nbOrders,  color:C.blue},
    {key:"invoices", label:tr("tab_invoices"), icon:"ti-receipt",          count:nbInvoices,color:C.teal,  badge:nbEchues>0?{n:nbEchues,c:C.red}:undefined},
    {key:"payments", label:tr("tab_payments"), icon:"ti-coin",             count:nbPayments,color:C.green},
  ];

  if(orders.length===0) return(
    <div style={{background:"#fff",border:`1.5px dashed ${C.b}`,borderRadius:C.rLg,padding:56,textAlign:"center"}}>
      <i className="ti ti-clipboard-off" style={{fontSize:36,color:C.b,display:"block",marginBottom:12}} aria-hidden="true"/>
      <p style={{color:C.t3,fontSize:14,margin:0}}>Aucune commande — utilisez le bouton <strong>+</strong> pour commencer.</p>
    </div>
  );

  return(
    <div style={{display:"flex",flexDirection:"column",gap:0}}>
      {/* ── TAB BAR + SEARCH ── */}
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12,flexWrap:"wrap"}}>
        <div style={{display:"flex",background:"#fff",border:`1px solid ${C.b}`,borderRadius:C.r,overflow:"hidden",boxShadow:C.sh}}>
          {TABS.map(t=>(
            <button key={t.key} onClick={()=>{setTab(t.key as any);setSearch("");setShowAll(false);}}
              style={{display:"flex",alignItems:"center",gap:6,padding:"9px 16px",border:"none",borderRight:`1px solid ${C.b}`,
                background:tab===t.key?t.color:"transparent",
                color:tab===t.key?"#fff":C.t2,
                fontWeight:tab===t.key?700:400,fontSize:12,cursor:"pointer",transition:"all .15s",whiteSpace:"nowrap",position:"relative"}}>
              <i className={`ti ${t.icon}`} style={{fontSize:14}} aria-hidden="true"/>
              {t.label}
              <span style={{marginLeft:2,background:tab===t.key?"rgba(255,255,255,.25)":C.b,color:tab===t.key?"#fff":C.t3,fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:99}}>{t.count}</span>
              {t.badge&&<span style={{position:"absolute",top:4,right:4,width:8,height:8,borderRadius:99,background:t.badge.c}}/>}
            </button>
          ))}
        </div>
        {/* Search */}
        <div style={{display:"flex",alignItems:"center",gap:8,background:"#fff",border:`1px solid ${C.b}`,borderRadius:C.r,padding:"7px 12px",boxShadow:C.sh,flex:1,minWidth:180,maxWidth:340}}>
          <i className="ti ti-search" style={{fontSize:14,color:C.t3,flexShrink:0}} aria-hidden="true"/>
          <input value={search} onChange={e=>{setSearch(e.target.value);setShowAll(true);}}
            placeholder={tab==="orders"?tr("search_orders"):tab==="invoices"?tr("search_invoices"):tr("search_payments")}
            style={{border:"none",outline:"none",fontSize:12,color:C.t1,background:"transparent",width:"100%",fontFamily:"inherit"}}/>
          {search&&<button onClick={()=>setSearch("")} style={{background:"none",border:"none",color:C.t3,cursor:"pointer",fontSize:13,lineHeight:1}}>✕</button>}
        </div>
        {/* Results count */}
        {search&&<span style={{fontSize:11,color:C.t3}}>
          {tab==="orders"?filterOrders.length:tab==="invoices"?filterInvoices.length:filterPayments.length} résultat{((tab==="orders"?filterOrders.length:tab==="invoices"?filterInvoices.length:filterPayments.length)>1?"s":"")}
        </span>}
      </div>

      {/* ══ TAB: COMMANDES ══ */}
      {tab==="orders"&&(()=>{
        const visible=showAll||search?filterOrders:filterOrders.slice(0,DEFAULT_SHOWN);
        const hiddenCount=filterOrders.length-DEFAULT_SHOWN;
        return(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {visible.length===0&&<div style={{padding:"28px",textAlign:"center",color:C.t3,fontSize:12,background:"#fff",borderRadius:C.r,border:`1px dashed ${C.b}`}}>Aucune commande trouvée</div>}
            {visible.map((order:any)=><OrderCard key={order.id} order={order} client={client} exp={exp} tgl={tgl} onAddInv={onAddInv} onEditOrder={onEditOrder} onDelOrder={onDelOrder} onAddPay={onAddPay} onEditPay={onEditPay} onDelPay={onDelPay} onEditInv={onEditInv} onDelInv={onDelInv} focusOrderId={focusOrderId} onClearFocus={onClearFocus} lang={lang} onSaveOrder={onSaveOrder}/>)}
            {!search&&!showAll&&hiddenCount>0&&(
              <button onClick={()=>setShowAll(true)} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"11px",background:"#fff",border:`1.5px dashed ${C.b}`,borderRadius:C.r,color:C.blue,fontWeight:600,fontSize:12,cursor:"pointer",transition:"all .15s"}}
                onMouseEnter={(e:any)=>{e.currentTarget.style.background=C.blueL;e.currentTarget.style.borderColor=C.blue;}}
                onMouseLeave={(e:any)=>{e.currentTarget.style.background="#fff";e.currentTarget.style.borderColor=C.b;}}>
                <i className="ti ti-chevrons-down" style={{fontSize:16}} aria-hidden="true"/>
                Afficher les {hiddenCount} commande{hiddenCount>1?"s":""} suivante{hiddenCount>1?"s":""}
              </button>
            )}
            {(showAll&&!search&&filterOrders.length>DEFAULT_SHOWN)&&(
              <button onClick={()=>setShowAll(false)} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"11px",background:"#fff",border:`1px solid ${C.b}`,borderRadius:C.r,color:C.t3,fontSize:12,cursor:"pointer"}}>
                <i className="ti ti-chevrons-up" style={{fontSize:16}} aria-hidden="true"/> Réduire
              </button>
            )}
          </div>
        );
      })()}

      {/* ══ TAB: FACTURES ══ */}
      {tab==="invoices"&&(()=>{
        const visible=showAll||search?filterInvoices:filterInvoices.slice(0,DEFAULT_SHOWN);
        const hiddenCount=filterInvoices.length-DEFAULT_SHOWN;
        return(
          <div style={{display:"flex",flexDirection:"column",gap:0,background:"#fff",borderRadius:C.rLg,border:`1px solid ${C.b}`,boxShadow:C.sh,overflow:"hidden"}}>
            <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",minWidth:750,borderCollapse:"collapse",fontSize:12}}>
              <thead>
                <tr style={{background:"#F8FAFC",borderBottom:`1px solid ${C.b}`}}>
                  {["Invoice #","PO","Date","Montant","Payé","Reste","Échéance","Statut","Actions"].map((h,i)=>(
                    <th key={h} style={{padding:"8px 10px",textAlign:["Montant","Payé","Reste"].includes(h)?"right":i>=7?"center":"left",color:C.t3,fontWeight:600,fontSize:10,textTransform:"uppercase",letterSpacing:".05em",whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.length===0&&<tr><td colSpan={9} style={{padding:"32px",textAlign:"center",color:C.t3,fontSize:12}}>Aucune facture trouvée</td></tr>}
                {visible.map((inv:any,ii:number)=>{
                  const ps=payStatus(inv);
                  return(
                    <tr key={inv.id} style={{borderBottom:`1px solid ${C.b}`,background:ii%2===0?"#fff":"#FAFBFD",transition:"background .12s"}}
                      onMouseEnter={(e:any)=>e.currentTarget.style.background="#F0F9FF"}
                      onMouseLeave={(e:any)=>e.currentTarget.style.background=ii%2===0?"#fff":"#FAFBFD"}>
                      <td style={{padding:"8px 10px",fontWeight:700,color:C.purple,whiteSpace:"nowrap"}}>{inv.invoiceNumber||"—"}</td>
                      <td style={{padding:"8px 10px",fontSize:11,color:C.t2,fontFamily:"monospace"}}>{inv._po||"—"}</td>
                      <td style={{padding:"8px 10px",color:C.t2,whiteSpace:"nowrap"}}>{fmtD(inv.date)}</td>
                      <td style={{padding:"8px 10px",textAlign:"right",fontWeight:700,color:C.teal,whiteSpace:"nowrap"}}>{fmt(+inv.amount||0)} €</td>
                      <td style={{padding:"8px 10px",textAlign:"right",color:C.green,fontWeight:ps.paid>0?600:400,whiteSpace:"nowrap"}}>{ps.paid>0?`${fmt(ps.paid)} €`:"—"}</td>
                      <td style={{padding:"8px 10px",textAlign:"right",fontWeight:700,color:ps.rem>0?(["overdue","ov_part"].includes(ps.key)?C.redDk:C.amberDk):C.t3,whiteSpace:"nowrap"}}>{ps.rem>0?`${fmt(ps.rem)} €`:"—"}</td>
                      <td style={{padding:"8px 10px",color:["overdue","ov_part"].includes(ps.key)?C.redDk:C.t2,fontWeight:["overdue","ov_part"].includes(ps.key)?700:400,whiteSpace:"nowrap"}}>{fmtD(inv.dueDate)}</td>
                      <td style={{padding:"8px 10px",textAlign:"center"}}><Tag label={ps.label} c={ps.color} bg={ps.bg} sm/></td>
                      <td style={{padding:"8px 10px",whiteSpace:"nowrap"}}>
                        <div style={{display:"flex",gap:3,justifyContent:"center"}}>
                          <IBtn icon="ti-coin" title="Paiement" c={C.green} bg={C.greenL} onClick={()=>onAddPay(inv._order,inv)} small/>
                          <IBtn icon="ti-edit" title="Modifier" c={C.blue} bg={C.blueL} onClick={()=>onEditInv(inv._order,inv)} small/>
                          <IBtn icon="ti-trash" title="Supprimer" c={C.red} bg={C.redL} onClick={()=>{if(window.confirm(tr("confirm_del_invoice")))onDelInv(inv._oid,inv.id);}} small/>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
            {!search&&!showAll&&hiddenCount>0&&(
              <button onClick={()=>setShowAll(true)} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"11px",background:"#F8FAFC",border:"none",borderTop:`1px solid ${C.b}`,color:C.blue,fontWeight:600,fontSize:12,cursor:"pointer",width:"100%"}}>
                <i className="ti ti-chevrons-down" style={{fontSize:16}} aria-hidden="true"/> Afficher les {hiddenCount} facture{hiddenCount>1?"s":""} suivante{hiddenCount>1?"s":""}
              </button>
            )}
            {showAll&&!search&&filterInvoices.length>DEFAULT_SHOWN&&(
              <button onClick={()=>setShowAll(false)} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"11px",background:"#F8FAFC",border:"none",borderTop:`1px solid ${C.b}`,color:C.t3,fontSize:12,cursor:"pointer",width:"100%"}}>
                <i className="ti ti-chevrons-up" style={{fontSize:16}} aria-hidden="true"/> Réduire
              </button>
            )}
          </div>
        );
      })()}

      {/* ══ TAB: PAIEMENTS ══ */}
      {tab==="payments"&&(()=>{
        const visible=showAll||search?filterPayments:filterPayments.slice(0,DEFAULT_SHOWN);
        const hiddenCount=filterPayments.length-DEFAULT_SHOWN;
        return(
          <div style={{display:"flex",flexDirection:"column",gap:0,background:"#fff",borderRadius:C.rLg,border:`1px solid ${C.b}`,boxShadow:C.sh,overflow:"hidden"}}>
            <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",minWidth:700,borderCollapse:"collapse",fontSize:12}}>
              <thead>
                <tr style={{background:"#F8FAFC",borderBottom:`1px solid ${C.b}`}}>
                  {["Date","PO #","Invoice #","Montant","Mode","Référence","Notes","Actions"].map((h,i)=>(
                    <th key={h} style={{padding:"8px 10px",textAlign:h==="Montant"?"right":h==="Actions"?"center":"left",color:C.t3,fontWeight:600,fontSize:10,textTransform:"uppercase",letterSpacing:".05em",whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.length===0&&<tr><td colSpan={8} style={{padding:"32px",textAlign:"center",color:C.t3,fontSize:12}}>Aucun paiement trouvé</td></tr>}
                {visible.map((p:any,pi:number)=>(
                  <tr key={p.id} style={{borderBottom:`1px solid ${C.b}`,background:pi%2===0?"#fff":"#FAFBFD"}}
                    onMouseEnter={(e:any)=>e.currentTarget.style.background="#F0FDF4"}
                    onMouseLeave={(e:any)=>e.currentTarget.style.background=pi%2===0?"#fff":"#FAFBFD"}>
                    <td style={{padding:"8px 10px",color:C.t2,whiteSpace:"nowrap"}}>{fmtD(p.date)}</td>
                    <td style={{padding:"8px 10px",fontSize:11,color:C.blue,fontFamily:"monospace",fontWeight:600}}>{p._po||"—"}</td>
                    <td style={{padding:"8px 10px",fontSize:11,color:C.purple,fontWeight:600}}>{p._invNum||"—"}</td>
                    <td style={{padding:"8px 10px",textAlign:"right",fontWeight:800,color:C.green,fontSize:13,whiteSpace:"nowrap"}}>{fmt(+p.amount||0)} €</td>
                    <td style={{padding:"8px 10px",color:C.t2}}>{p.method||"—"}</td>
                    <td style={{padding:"8px 10px",color:C.t2,fontFamily:"monospace",fontSize:11}}>{p.reference||"—"}</td>
                    <td style={{padding:"8px 10px",color:C.t3,fontSize:11,maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.notes||"—"}</td>
                    <td style={{padding:"8px 10px",whiteSpace:"nowrap"}}>
                      <div style={{display:"flex",gap:3,justifyContent:"center"}}>
                        <IBtn icon="ti-edit" title={tr("edit_payment")} c={C.blue} bg={C.blueL} onClick={()=>onEditPay(p._inv._order,p._inv,p)} small/>
                        <IBtn icon="ti-trash" title={tr("delete")} c={C.red} bg={C.redL} onClick={()=>{if(window.confirm(tr("confirm_del_payment")))onDelPay(p._inv._oid,p._inv.id,p.id);}} small/>
                      </div>
                    </td>
                  </tr>
                ))}
                {/* Total row */}
                {visible.length>0&&(
                  <tr style={{background:C.greenL,borderTop:`2px solid ${C.green}30`}}>
                    <td colSpan={3} style={{padding:"10px 14px",fontWeight:700,color:C.greenDk,fontSize:12}}>Total affiché</td>
                    <td style={{padding:"10px 14px",textAlign:"right",fontWeight:800,color:C.greenDk,fontSize:14}}>{fmt(visible.reduce((s:number,p:any)=>s+(+p.amount||0),0))} €</td>
                    <td colSpan={4} style={{padding:"10px 14px",fontSize:11,color:C.greenDk}}>{visible.length} paiement{visible.length>1?"s":""} · Total global : <strong>{fmt(allPayments.reduce((s:number,p:any)=>s+(+p.amount||0),0))} €</strong></td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
            {!search&&!showAll&&hiddenCount>0&&(
              <button onClick={()=>setShowAll(true)} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"11px",background:"#F8FAFC",border:"none",borderTop:`1px solid ${C.b}`,color:C.green,fontWeight:600,fontSize:12,cursor:"pointer",width:"100%"}}>
                <i className="ti ti-chevrons-down" style={{fontSize:16}} aria-hidden="true"/> Afficher les {hiddenCount} paiement{hiddenCount>1?"s":""} suivant{hiddenCount>1?"s":""}
              </button>
            )}
            {showAll&&!search&&filterPayments.length>DEFAULT_SHOWN&&(
              <button onClick={()=>setShowAll(false)} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"11px",background:"#F8FAFC",border:"none",borderTop:`1px solid ${C.b}`,color:C.t3,fontSize:12,cursor:"pointer",width:"100%"}}>
                <i className="ti ti-chevrons-up" style={{fontSize:16}} aria-hidden="true"/> Réduire
              </button>
            )}
          </div>
        );
      })()}
    </div>
  );
}

// ─── ORDER CARD (extracted from CustomerPage) ───────────────────────────────────
function OrderCard({order,client,exp,tgl,onAddInv,onEditOrder,onDelOrder,onAddPay,onEditPay,onDelPay,onEditInv,onDelInv,focusOrderId,onClearFocus,lang="fr",onSaveOrder}:any){
  const tr=(k:string,v?:any)=>t(lang as Lang,k,v);
  const invoiced=(order.invoices||[]).reduce((s:number,i:any)=>s+(+i.amount||0),0);
  const open=Math.max(0,(+order.amount||0)-invoiced);
  const pct=+order.amount>0?Math.min(100,(invoiced/+order.amount)*100):0;
  const isExp=exp[order.id];
  const sty=SS[order.status]||{c:C.t2,bg:"#F1F5F9"};
  const meta=getStatusMeta(order.status);
  const isLate=order.expectedDate&&new Date(order.expectedDate+"T00:00:00")<new Date()&&open>0;
  const totalPaid=(order.invoices||[]).reduce((s:number,i:any)=>s+(i.payments||[]).reduce((ss:number,p:any)=>ss+(+p.amount||0),0),0);
  const nbEchues=(order.invoices||[]).filter((i:any)=>["overdue","ov_part"].includes(payStatus(i).key)).length;
  const amtEchues=(order.invoices||[]).filter((i:any)=>["overdue","ov_part"].includes(payStatus(i).key)).reduce((s:number,i:any)=>s+payStatus(i).rem,0);
  const nbUpcoming=(order.invoices||[]).filter((i:any)=>["today","soon","soon_part"].includes(payStatus(i).key)).length;
  const nbEnCours=(order.invoices||[]).filter((i:any)=>["pending","partial","ok"].includes(payStatus(i).key)).length;
  const hasOverdue=nbEchues>0;
  const allPaid=(order.invoices||[]).length>0&&(order.invoices||[]).every((i:any)=>payStatus(i).key==="paid");
  const payPct=invoiced>0?Math.min(100,totalPaid/invoiced*100):0;
  const hasUpcoming=nbUpcoming>0;
  const hasEnCours=nbEnCours>0;

  return(
    <div key={order.id} id={`order-${order.id}`}
      style={{background:"#fff",borderRadius:C.rLg,boxShadow:focusOrderId===order.id?`0 0 0 3px ${C.blue}40,${C.shMd}`:C.sh,border:`1px solid ${focusOrderId===order.id?C.blue:nbEchues>0?C.red+"50":nbUpcoming>0?C.amber+"40":C.b}`,overflow:"hidden",transition:"box-shadow .2s,border-color .2s"}}
      onMouseEnter={(e:any)=>e.currentTarget.style.boxShadow=C.shMd}
      onMouseLeave={(e:any)=>e.currentTarget.style.boxShadow=focusOrderId===order.id?`0 0 0 3px ${C.blue}40,${C.shMd}`:C.sh}>
      <div style={{display:"flex",alignItems:"center",gap:12,padding:"14px 18px",cursor:"pointer"}} onClick={()=>{tgl(order.id);if(focusOrderId===order.id&&onClearFocus)onClearFocus();}}>
        <i className={`ti ${isExp?"ti-chevron-down":"ti-chevron-right"}`} style={{fontSize:15,color:C.t3,flexShrink:0}} aria-hidden="true"/>
        <div style={{flex:1,display:"grid",gridTemplateColumns:client==="CIMELEC"?"1.2fr 0.9fr 0.9fr 0.9fr 1.1fr 1fr 1fr":"1.4fr 1fr 1fr 1.2fr 1.1fr 1.1fr",gap:10,alignItems:"center",minWidth:0}}>
          <div><div style={{fontSize:10,color:C.t3,marginBottom:2,textTransform:"uppercase",letterSpacing:".04em"}}>PO #</div><div style={{fontWeight:700,fontSize:13,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{order.poNumber||"—"}</div></div>
          <div><div style={{fontSize:10,color:C.t3,marginBottom:2,textTransform:"uppercase",letterSpacing:".04em"}}>S/O</div><div style={{fontSize:12,color:C.t2}}>{order.soNumber||"—"}</div></div>
          {client==="CIMELEC"&&<div><div style={{fontSize:10,color:C.t3,marginBottom:2,textTransform:"uppercase",letterSpacing:".04em"}}>N° Commande</div><div style={{fontSize:12,color:C.purple,fontWeight:600}}>{order.orderNumber||"—"}</div></div>}
          <div><div style={{fontSize:10,color:C.t3,marginBottom:2,textTransform:"uppercase",letterSpacing:".04em"}}>Date</div><div style={{fontSize:12,color:C.t2}}>{fmtD(order.date)}</div></div>
          <div><div style={{fontSize:10,color:C.t3,marginBottom:2,textTransform:"uppercase",letterSpacing:".04em"}}>Montant PO</div><div style={{fontWeight:700,fontSize:13,color:C.blue}}>{fmt(order.amount)} €</div></div>
          <div><div style={{fontSize:10,color:C.t3,marginBottom:2,textTransform:"uppercase",letterSpacing:".04em"}}>Facturé / Reste</div><div style={{fontSize:12}}><span style={{color:C.teal,fontWeight:600}}>{fmt(invoiced)}</span><span style={{color:C.t3}}> / </span><span style={{color:open>0?C.amber:C.green,fontWeight:600}}>{fmt(open)}</span></div></div>
          <div><div style={{fontSize:10,color:C.t3,marginBottom:2,textTransform:"uppercase",letterSpacing:".04em"}}>Encaissé</div><div style={{fontSize:12,color:C.green,fontWeight:600}}>{fmt(totalPaid)} €</div></div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {isLate&&<Tag label="⏰ RETARD LIVR." c={C.red} bg={C.redL}/>}
          {nbEchues>0&&<Tag label={`⚠ ${nbEchues} ÉCHU${nbEchues>1?"ES":"E"} · ${fmtK(amtEchues)} €`} c={C.redDk} bg={C.redL}/>}
          {nbEchues===0&&nbUpcoming>0&&<Tag label={`🔔 ${nbUpcoming} ÉCHÉANCE${nbUpcoming>1?"S":""} PROCHE${nbUpcoming>1?"S":""}`} c={C.amberDk} bg={C.amberL}/>}
          {nbEchues===0&&nbUpcoming===0&&nbEnCours>0&&payPct>0&&payPct<100&&<Tag label={`${payPct.toFixed(0)}% ENCAISSÉ`} c={C.teal} bg={C.tealL}/>}
          {allPaid&&invoiced>0&&<Tag label="✓ SOLDÉ" c={C.greenDk} bg={C.greenL}/>}
          <span style={{display:"flex",alignItems:"center",gap:5,fontSize:11,background:sty.bg,color:sty.c,padding:"4px 10px",borderRadius:5,fontWeight:600,whiteSpace:"nowrap",border:`1px solid ${sty.c}30`}}>
            <i className={`ti ${meta.icon||"ti-circle"}`} style={{fontSize:13}} aria-hidden="true"/>
            {meta.label||order.status||"N/A"}
            {sty.alert&&<span style={{width:6,height:6,borderRadius:99,background:C.red,flexShrink:0}}/>}
          </span>
          {/* Date prévue affichée en face du statut */}
          {order.expectedDate&&(()=>{
            const d=diffD(order.expectedDate);
            const isLateDate=d<0&&open>0;
            const isSoon=d>=0&&d<=7;
            return(
              <span style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:isLateDate?C.redDk:isSoon?C.amberDk:C.t3,fontWeight:isLateDate||isSoon?600:400,whiteSpace:"nowrap",background:isLateDate?C.redL:isSoon?C.amberL:"transparent",padding:isLateDate||isSoon?"3px 8px":"0",borderRadius:4}}>
                <i className="ti ti-calendar" style={{fontSize:12}} aria-hidden="true"/>
                {isLateDate?`${Math.abs(d)}j de retard`:isSoon?`Dans ${d}j`:fmtD(order.expectedDate)}
              </span>
            );
          })()}
          <div style={{display:"flex",gap:4}} onClick={(e:any)=>e.stopPropagation()}>
            <IBtn icon="ti-plus" title="Ajouter facture" c={C.teal} bg={C.tealL} onClick={()=>onAddInv(order)}/>
            <IBtn icon="ti-edit" title="Modifier" c={C.blue} bg={C.blueL} onClick={()=>onEditOrder(order)}/>
            <IBtn icon="ti-trash" title="Supprimer" c={C.red} bg={C.redL} onClick={()=>{if(window.confirm(tr("confirm_del_order")))onDelOrder(order.id);}}/>
          </div>
        </div>
      </div>
      <div style={{position:"relative"}}>
        <div style={{height:4,background:"#F1F5F9"}}><div style={{height:"100%",width:`${pct}%`,background:pct>=100?C.teal:pct>=50?C.teal:C.amber,transition:"width .4s",borderRadius:"0 2px 2px 0",opacity:.85}}/></div>
        {invoiced>0&&<div style={{height:3,background:"#F1F5F9"}}><div style={{height:"100%",width:`${Math.min(100,+order.amount>0?totalPaid/+order.amount*100:0)}%`,background:C.green,transition:"width .4s",borderRadius:"0 2px 2px 0"}}/></div>}
      </div>
      {isExp&&(
        <div style={{padding:18,borderTop:`1px solid ${C.b}`,background:"#FAFBFD"}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16,background:"#fff",padding:14,borderRadius:C.r,border:`1px solid ${C.b}`,fontSize:12}}>
            <div><span style={{color:C.t3,fontSize:11}}>Mode livraison</span><br/><strong>{order.deliveryMode||"—"}</strong></div>
            <div><span style={{color:C.t3,fontSize:11}}>Date prévue</span><br/><strong style={{color:isLate?C.red:"inherit"}}>{fmtD(order.expectedDate)}{isLate?" ⚠":""}</strong></div>
            <div><span style={{color:C.t3,fontSize:11}}>Nb factures</span><br/><strong>{(order.invoices||[]).length}</strong></div>
            <div><span style={{color:C.t3,fontSize:11}}>Notes</span><br/><strong style={{wordBreak:"break-word"}}>{order.notes||"—"}</strong></div>
          </div>
          {/* ── Pièces jointes ── */}
          <FileAttachments
            files={order.attachments||[]}
            entityId={order.id}
            entityType="order"
            onAdd={(f:any)=>{const upd={...order,attachments:[...(order.attachments||[]),f]};if(onSaveOrder)onSaveOrder(upd);else onEditOrder(upd);}}
            onDel={(idx:number)=>{const a=[...(order.attachments||[])];a.splice(idx,1);const upd={...order,attachments:a};if(onSaveOrder)onSaveOrder(upd);else onEditOrder(upd);}}
          />
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <h4 style={{margin:0,fontSize:13,fontWeight:700,color:C.t1}}>Expéditions & Factures</h4>
            <Btn icon="ti-plus" label="Ajouter facture" onClick={()=>onAddInv(order)} variant="success" small/>
          </div>
          {(order.invoices||[]).length===0?(
            <div style={{background:"#fff",border:`1px dashed ${C.b}`,borderRadius:C.r,padding:20,textAlign:"center",color:C.t3,fontSize:12}}>Aucune facture pour cette commande</div>
          ):(
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {(order.invoices||[]).map((inv:any)=>{
                const ps=payStatus(inv);const paidAmt=ps.paid;const pctPay=+inv.amount>0?Math.min(100,paidAmt/+inv.amount*100):0;
                return(
                  <div key={inv.id} style={{background:"#fff",borderRadius:C.r,border:`1px solid ${ps.key.startsWith("over")||ps.key==="today"?C.red+"50":C.b}`,overflow:"hidden"}}>
                    <div style={{display:"grid",gridTemplateColumns:"1.5fr 1fr 1.2fr 1fr 1.5fr auto",gap:10,alignItems:"center",padding:"12px 14px"}}>
                      <div><div style={{fontSize:10,color:C.t3,marginBottom:2,textTransform:"uppercase",letterSpacing:".04em"}}>Invoice #</div><div style={{fontWeight:700,fontSize:13,color:C.purple}}>{inv.invoiceNumber||"—"}</div></div>
                      <div><div style={{fontSize:10,color:C.t3,marginBottom:2,textTransform:"uppercase",letterSpacing:".04em"}}>Date</div><div style={{fontSize:12,color:C.t2}}>{fmtD(inv.date)}</div></div>
                      <div><div style={{fontSize:10,color:C.t3,marginBottom:2,textTransform:"uppercase",letterSpacing:".04em"}}>Montant</div><div style={{fontWeight:700,fontSize:13,color:C.teal}}>{fmt(inv.amount)} €</div></div>
                      <div><div style={{fontSize:10,color:C.t3,marginBottom:2,textTransform:"uppercase",letterSpacing:".04em"}}>Échéance</div><div style={{fontSize:12,color:inv.dueDate?C.t2:C.t3}}>{fmtD(inv.dueDate)}</div></div>
                      <div>
                        <div style={{fontSize:10,color:C.t3,marginBottom:2,textTransform:"uppercase",letterSpacing:".04em"}}>Paiement</div>
                        <Tag label={ps.label} c={ps.color} bg={ps.bg} sm/>
                        <div style={{height:3,background:"#F1F5F9",borderRadius:99,marginTop:4,width:120}}><div style={{height:"100%",width:`${pctPay}%`,background:ps.color,borderRadius:99}}/></div>
                      </div>
                      <div style={{display:"flex",gap:4}}>
                        <IBtn icon="ti-coin" title="Enregistrer paiement" c={C.green} bg={C.greenL} onClick={()=>onAddPay(order,inv)}/>
                        <IBtn icon="ti-edit" title="Modifier facture" c={C.blue} bg={C.blueL} onClick={()=>onEditInv(order,inv)}/>
                        <IBtn icon="ti-trash" title="Supprimer" c={C.red} bg={C.redL} onClick={()=>{if(window.confirm(tr("confirm_del_invoice")))onDelInv(order.id,inv.id);}}/>
                      </div>
                    </div>
                    {(inv.payments||[]).length>0&&(
                      <div style={{borderTop:`1px solid ${C.b}`,background:"#F8FFF8",padding:"10px 14px"}}>
                        <p style={{margin:"0 0 8px",fontSize:11,fontWeight:600,color:C.green}}>Paiements reçus</p>
                        <div style={{display:"flex",flexDirection:"column",gap:4}}>
                          {(inv.payments||[]).map((p:any)=>(
                            <div key={p.id} style={{display:"flex",alignItems:"center",gap:12,fontSize:12}}>
                              <span style={{color:C.t3,minWidth:90}}>{fmtD(p.date)}</span>
                              <span style={{fontWeight:700,color:C.green,minWidth:100}}>{fmt(p.amount)} €</span>
                              <span style={{color:C.t2,flex:1}}>{p.method||"—"}{p.reference?` · Réf: ${p.reference}`:""}</span>
                              <div style={{display:"flex",gap:3}}>
                                <IBtn icon="ti-edit" title="Modifier" c={C.blue} bg={C.blueL} onClick={()=>onEditPay(order,inv,p)} small/>
                                <IBtn icon="ti-trash" title="Supprimer" c={C.red} bg={C.redL} onClick={()=>{if(window.confirm(tr("confirm_del_payment")))onDelPay(order.id,inv.id,p.id);}} small/>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div style={{borderTop:`1px solid ${C.greenL}`,marginTop:8,paddingTop:8,display:"flex",gap:20,fontSize:12}}>
                          <span style={{color:C.t2}}>Total payé : <strong style={{color:C.green}}>{fmt(paidAmt)} €</strong></span>
                          {ps.rem>0&&<span style={{color:C.t2}}>Reste : <strong style={{color:C.red}}>{fmt(ps.rem)} €</strong></span>}
                          {ps.rem===0&&<span style={{color:C.green,fontWeight:600}}>✓ Entièrement réglé</span>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── FILE ATTACHMENTS ────────────────────────────────────────────────────────
function FileAttachments({files,entityId,entityType,onAdd,onDel}:any){
  const[uploading,setUploading]=useState(false);
  const[error,setError]=useState<string|null>(null);
  const inputRef=useRef<HTMLInputElement>(null);

  const handleUpload=async(e:any)=>{
    const file=e.target.files?.[0];
    if(!file)return;
    if(file.size>10*1024*1024){setError("Fichier trop volumineux (max 10 Mo)");return;}
    setUploading(true);setError(null);
    const ext=file.name.split(".").pop();
    const path=`${entityType}/${entityId}/${Date.now()}.${ext}`;
    const url=await uploadFile(file,path);
    if(url){
      onAdd({name:file.name,url,path,size:file.size,type:file.type,date:new Date().toISOString()});
    } else {
      setError("Échec du téléchargement. Vérifiez la configuration du bucket Supabase.");
    }
    setUploading(false);
    if(inputRef.current)inputRef.current.value="";
  };

  const handleDel=async(idx:number,path:string)=>{
    if(!window.confirm("Supprimer cette pièce jointe ?"))return;
    await deleteFile(path);
    onDel(idx);
  };

  const fmtSize=(b:number)=>b>1024*1024?`${(b/1024/1024).toFixed(1)} Mo`:b>1024?`${(b/1024).toFixed(0)} Ko`:`${b} o`;
  const fileIcon=(type:string)=>{
    if(type?.includes("pdf"))return{icon:"ti-file-type-pdf",color:"#DC2626"};
    if(type?.includes("image"))return{icon:"ti-photo",color:"#7C3AED"};
    if(type?.includes("excel")||type?.includes("spreadsheet"))return{icon:"ti-file-type-xls",color:"#059669"};
    if(type?.includes("word"))return{icon:"ti-file-type-doc",color:"#2563EB"};
    return{icon:"ti-file",color:C.t3};
  };

  return(
    <div style={{marginBottom:16,background:"#fff",border:`1px solid ${C.b}`,borderRadius:C.r,padding:"12px 14px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:files?.length>0?10:0}}>
        <span style={{fontSize:12,fontWeight:600,color:C.t1,display:"flex",alignItems:"center",gap:6}}>
          <i className="ti ti-paperclip" style={{fontSize:14,color:C.t3}} aria-hidden="true"/>
          Pièces jointes {files?.length>0&&<span style={{background:C.blueL,color:C.blueDk,borderRadius:99,fontSize:10,padding:"1px 7px",fontWeight:700}}>{files.length}</span>}
        </span>
        <div>
          <input ref={inputRef} type="file" style={{display:"none"}} onChange={handleUpload}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp"/>
          <button onClick={()=>inputRef.current?.click()} disabled={uploading}
            style={{display:"flex",alignItems:"center",gap:5,background:C.blueL,color:C.blueDk,border:"none",borderRadius:5,padding:"5px 10px",fontSize:11,fontWeight:600,cursor:uploading?"not-allowed":"pointer",opacity:uploading?.6:1}}>
            {uploading
              ?<><i className="ti ti-loader-2 rotating" style={{fontSize:13}} aria-hidden="true"/> Envoi…</>
              :<><i className="ti ti-upload" style={{fontSize:13}} aria-hidden="true"/> Joindre un fichier</>}
          </button>
        </div>
      </div>
      {error&&<div style={{fontSize:11,color:C.redDk,background:C.redL,borderRadius:4,padding:"4px 8px",marginBottom:8}}>{error}</div>}
      {files?.length>0&&(
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {files.map((f:any,i:number)=>{
            const fi=fileIcon(f.type);
            return(
              <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",background:"#F8FAFC",borderRadius:5,border:`1px solid ${C.b}`}}>
                <i className={`ti ${fi.icon}`} style={{fontSize:16,color:fi.color,flexShrink:0}} aria-hidden="true"/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:500,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</div>
                  <div style={{fontSize:10,color:C.t3}}>{fmtSize(f.size)} · {fmtD(f.date)}</div>
                </div>
                <a href={f.url} target="_blank" rel="noreferrer"
                  style={{background:C.blueL,color:C.blueDk,border:"none",borderRadius:4,padding:"3px 8px",fontSize:11,fontWeight:500,cursor:"pointer",textDecoration:"none",display:"flex",alignItems:"center",gap:4}}>
                  <i className="ti ti-download" style={{fontSize:12}} aria-hidden="true"/> Ouvrir
                </a>
                <button onClick={()=>handleDel(i,f.path)}
                  style={{background:C.redL,color:C.redDk,border:"none",borderRadius:4,width:24,height:24,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}>
                  <i className="ti ti-trash" style={{fontSize:12}} aria-hidden="true"/>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── WEEKLY REPORT PAGE ──────────────────────────────────────────────────────
// ─── ACTIVITY TABLE (standalone to avoid focus loss on re-render) ─────────────
const PRIORITIES_LIST=["HIGH","MEDIUM","LOW"];
const STATUSES_LIST=["📋","🔄","✅","🎓","⚠️"];

function ActivityTable({items,onAdd,onUpdate,onRemove,title,color,isMobile}:any){
  return(
    <div style={{background:"#fff",borderRadius:C.rLg,border:`1px solid ${C.b}`,boxShadow:C.sh,overflow:"hidden"}}>
      <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.b}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{fontWeight:600,fontSize:13,color:C.t1}}>{title}</span>
        <button onClick={onAdd} style={{display:"flex",alignItems:"center",gap:5,background:color+"18",color,border:"none",borderRadius:5,padding:"5px 10px",fontSize:11,fontWeight:600,cursor:"pointer"}}>
          <i className="ti ti-plus" style={{fontSize:13}} aria-hidden="true"/> Ajouter
        </button>
      </div>
      <div style={{padding:"12px 18px",display:"flex",flexDirection:"column",gap:8}}>
        {items.map((item:any,idx:number)=>(
          <div key={idx} style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 2fr 80px 32px",gap:8,alignItems:"center"}}>
            <input value={item.client} onChange={e=>onUpdate(idx,"client",e.target.value)}
              placeholder="Customer / Prospect"
              style={{padding:"6px 8px",borderRadius:5,border:`1px solid ${C.b}`,fontSize:12,fontFamily:"inherit",width:"100%",boxSizing:"border-box"}}/>
            <input value={item.action} onChange={e=>onUpdate(idx,"action",e.target.value)}
              placeholder="Description de l'activité…"
              style={{padding:"6px 8px",borderRadius:5,border:`1px solid ${C.b}`,fontSize:12,fontFamily:"inherit",width:"100%",boxSizing:"border-box"}}/>
            <select value={item.status} onChange={e=>onUpdate(idx,"status",e.target.value)}
              style={{padding:"6px 8px",borderRadius:5,border:`1px solid ${C.b}`,fontSize:14,textAlign:"center"}}>
              {STATUSES_LIST.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={()=>onRemove(idx)}
              style={{background:C.redL,color:C.redDk,border:"none",borderRadius:5,width:32,height:32,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <i className="ti ti-trash" style={{fontSize:13}} aria-hidden="true"/>
            </button>
          </div>
        ))}
        {items.length===0&&<div style={{textAlign:"center",padding:"20px",color:C.t3,fontSize:12}}>Aucune activité — cliquez sur "+ Ajouter"</div>}
      </div>
    </div>
  );
}

function WeeklyReportPage({getAllOrders,clients,data,configs,lang,isMobile}:any){
  const today=new Date();
  // Get current week number
  const getWeekNum=(d:Date)=>{const s=new Date(d.getFullYear(),0,1);return Math.ceil(((d.getTime()-s.getTime())/86400000+s.getDay()+1)/7);};
  const weekNum=getWeekNum(today);
  const year=today.getFullYear();
  const REPORT_KEY="ordertrack_reports";
  const DRAFT_KEY="ordertrack_report_draft";

  // Load draft from localStorage on init
  const loadDraft=()=>{
    try{const d=localStorage.getItem(DRAFT_KEY);if(d)return JSON.parse(d);}catch{}
    return null;
  };
  const draft=loadDraft();
  const defaultPeriod=()=>{const m=today.toLocaleDateString("fr-FR",{month:"long"});return m.charAt(0).toUpperCase()+m.slice(1)+" "+year;};

  const [weekLabel,setWeekLabel]=useState(draft?.weekLabel||`S${weekNum}`);
  const [period,setPeriod]=useState(draft?.period||defaultPeriod());
  const [lastWeekItems,setLastWeekItems]=useState(draft?.lastWeekItems||[{priority:"HIGH",client:"",action:"",status:"📋"}]);
  const [thisWeekItems,setThisWeekItems]=useState(draft?.thisWeekItems||[{priority:"HIGH",client:"",action:"",status:"📋"}]);
  const [expectedOrders,setExpectedOrders]=useState(draft?.expectedOrders||[{client:"",project:"",est:""}]);
  const [plannedInvoices,setPlannedInvoices]=useState<any[]>(draft?.plannedInvoices||[]);
  const [showPreview,setShowPreview]=useState(false);
  const [orderPeriod,setOrderPeriod]=useState(7);
  const [invoicePeriod,setInvoicePeriod]=useState(30);
  const [savedReports,setSavedReports]=useState<any[]>(()=>{try{const r=localStorage.getItem(REPORT_KEY);return r?JSON.parse(r):[];}catch{return [];}});
  const [showHistory,setShowHistory]=useState(false);
  const [saveMsg,setSaveMsg]=useState("");

  // Auto-save draft on every change
  useEffect(()=>{
    const draft={weekLabel,period,lastWeekItems,thisWeekItems,expectedOrders,plannedInvoices};
    try{localStorage.setItem(DRAFT_KEY,JSON.stringify(draft));}catch{}
  },[weekLabel,period,lastWeekItems,thisWeekItems,expectedOrders]);

  const saveReport=async()=>{
    const report={
      id:Date.now().toString(),
      weekLabel,period,orderPeriod,invoicePeriod,
      lastWeekItems,thisWeekItems,expectedOrders,plannedInvoices,
      savedAt:new Date().toISOString(),
      label:`${weekLabel} — ${period}`
    };
    const updated=[report,...savedReports.filter((r:any)=>r.weekLabel!==weekLabel)].slice(0,20);
    setSavedReports(updated);
    // Save locally
    try{localStorage.setItem(REPORT_KEY,JSON.stringify(updated));}catch{}
    // Save to Supabase under reports key
    try{
      const K="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4eHJ4bnl4Zm1nY2R6eGNpZ2R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMTg5MzIsImV4cCI6MjA5NTc5NDkzMn0.wF2mt8BK1KGk-VyK4zZQvFGJCxCp8UGDPdgT_8DHc6o";
      const B="https://vxxrxnyxfmgcdzxcigdw.supabase.co";
      await fetch(B+"/rest/v1/ordertrack_data?apikey="+K+"&user_key=eq.ordertrack-reports",{
        method:"PATCH",headers:{"Content-Type":"application/json","apikey":K,"Authorization":"Bearer "+K,"Prefer":"return=minimal"},
        body:JSON.stringify({payload:{reports:updated}})
      }).then(async r=>{
        if(r.status===404||r.status===200||r.status===204)return;
        // Insert if not exists
        await fetch(B+"/rest/v1/ordertrack_data?apikey="+K,{
          method:"POST",headers:{"Content-Type":"application/json","apikey":K,"Authorization":"Bearer "+K,"Prefer":"resolution=merge-duplicates,return=minimal"},
          body:JSON.stringify({user_key:"ordertrack-reports",payload:{reports:updated}})
        });
      });
    }catch(e){console.warn("Report sync failed",e);}
    setSaveMsg(`✓ Rapport ${weekLabel} sauvegardé et synchronisé`);
    setTimeout(()=>setSaveMsg(""),3000);
  };

  // Load reports from Supabase on init
  useEffect(()=>{
    const K="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4eHJ4bnl4Zm1nY2R6eGNpZ2R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMTg5MzIsImV4cCI6MjA5NTc5NDkzMn0.wF2mt8BK1KGk-VyK4zZQvFGJCxCp8UGDPdgT_8DHc6o";
    const B="https://vxxrxnyxfmgcdzxcigdw.supabase.co";
    fetch(B+"/rest/v1/ordertrack_data?apikey="+K+"&user_key=eq.ordertrack-reports&select=payload&limit=1",
      {headers:{"apikey":K,"Authorization":"Bearer "+K,"Prefer":"return=representation"}}
    ).then(r=>r.ok?r.json():null).then(rows=>{
      if(rows?.[0]?.payload?.reports){
        const cloud=rows[0].payload.reports;
        setSavedReports(cloud);
        try{localStorage.setItem(REPORT_KEY,JSON.stringify(cloud));}catch{}
      }
    }).catch(()=>{});
  },[]);

  const loadReport=(r:any)=>{
    setWeekLabel(r.weekLabel);setPeriod(r.period);
    setLastWeekItems(r.lastWeekItems||[]);
    setThisWeekItems(r.thisWeekItems||[]);
    setExpectedOrders(r.expectedOrders||[]);
    if(r.plannedInvoices)setPlannedInvoices(r.plannedInvoices);
    if(r.orderPeriod)setOrderPeriod(r.orderPeriod);
    if(r.invoicePeriod)setInvoicePeriod(r.invoicePeriod);
    setShowHistory(false);
    setSaveMsg(`✓ Rapport ${r.weekLabel} chargé`);
    setTimeout(()=>setSaveMsg(""),3000);
  };

  const deleteReport=(id:string)=>{
    const updated=savedReports.filter((r:any)=>r.id!==id);
    setSavedReports(updated);
    try{localStorage.setItem(REPORT_KEY,JSON.stringify(updated));}catch{}
  };

  const newReport=()=>{
    if(!window.confirm("Créer un nouveau rapport ? Le brouillon actuel sera effacé."))return;
    setWeekLabel(`S${weekNum}`);setPeriod(defaultPeriod());
    setLastWeekItems([{priority:"HIGH",client:"",action:"",status:"📋"}]);
    setThisWeekItems([{priority:"HIGH",client:"",action:"",status:"📋"}]);
    setExpectedOrders([{client:"",project:"",est:""}]);
    try{localStorage.removeItem(DRAFT_KEY);}catch{}
  };



  const all=getAllOrders();
  const allOrders=(clients||[]).flatMap((c:string)=>(data?.[c]||[]).map((o:any)=>({...o,_client:c})));

  // ── Auto-computed data ──────────────────────────────────────────────────
  // Orders received this week (last 7 days)
  const periodStart=new Date(today);periodStart.setDate(today.getDate()-orderPeriod);
  const recentOrders=allOrders.filter((o:any)=>{
    if(!o.date)return false;
    return new Date(o.date+"T00:00:00")>=periodStart;
  });
  const recentOrdersAmt=recentOrders.reduce((s:number,o:any)=>s+(+o.amount||0),0);
  const periodLabel=orderPeriod===7?"7 jours":orderPeriod===30?"1 mois":orderPeriod===60?"2 mois":"3 mois";

  // Monthly invoicing (current month)
  const thisMonth=today.getMonth();const thisYear=today.getFullYear();
  const prevMonth=thisMonth===0?11:thisMonth-1;const prevMonthYear=thisMonth===0?thisYear-1:thisYear;
  const allInvoices=allOrders.flatMap((o:any)=>(o.invoices||[]).map((i:any)=>({...i,_client:o._client,_po:o.poNumber,_so:o.soNumber})));
  // Dynamic invoice period
  const invPeriodStart=new Date(today);invPeriodStart.setDate(today.getDate()-invoicePeriod);
  const invoicePeriodLabel=invoicePeriod===7?"7 jours":invoicePeriod===30?"1 mois":invoicePeriod===60?"2 mois":"3 mois";
  const invoicesInPeriod=allInvoices.filter((i:any)=>{
    if(!i.date)return false;
    return new Date(i.date+"T00:00:00")>=invPeriodStart;
  });
  const invoicedInPeriod=invoicesInPeriod.reduce((s:number,i:any)=>s+(+i.amount||0),0);
  // Keep monthly for PDF
  const invoicesThisMonth=allInvoices.filter((i:any)=>{
    if(!i.date)return false;
    const d=new Date(i.date+"T00:00:00");
    return d.getMonth()===thisMonth&&d.getFullYear()===thisYear;
  });
  const invoicesPrevMonth=allInvoices.filter((i:any)=>{
    if(!i.date)return false;
    const d=new Date(i.date+"T00:00:00");
    return d.getMonth()===prevMonth&&d.getFullYear()===prevMonthYear;
  });
  const invoicedThisMonth=invoicesThisMonth.reduce((s:number,i:any)=>s+(+i.amount||0),0);
  const invoicedPrevMonth=invoicesPrevMonth.reduce((s:number,i:any)=>s+(+i.amount||0),0);
  
  // YTD invoiced
  const ytdInvoiced=allInvoices.filter((i:any)=>{
    if(!i.date)return false;
    return new Date(i.date+"T00:00:00").getFullYear()===thisYear;
  }).reduce((s:number,i:any)=>s+(+i.amount||0),0);

  // Open orders
  const openOrders=allOrders.reduce((s:number,o:any)=>{
    const inv=(o.invoices||[]).reduce((ss:number,i:any)=>ss+(+i.amount||0),0);
    return s+Math.max(0,(+o.amount||0)-inv);
  },0);

  // Expected invoicing (invoices not yet created on open orders)
  const expectedInvoicing=allOrders.filter((o:any)=>o.status!=="annule").reduce((s:number,o:any)=>{
    const inv=(o.invoices||[]).reduce((ss:number,i:any)=>ss+(+i.amount||0),0);
    return s+Math.max(0,(+o.amount||0)-inv);
  },0);

  // Group invoices by client
  const invByCustomer:Record<string,number>={};
  [...invoicesThisMonth,...invoicesPrevMonth].forEach((i:any)=>{
    invByCustomer[i._client]=(invByCustomer[i._client]||0)+(+i.amount||0);
  });



  const MONTH_NAMES=["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

  // ── Print function ─────────────────────────────────────────────────────────
  const printMonthlyReport=()=>{
    const w=window.open("","_blank","width=1200,height=900");
    if(!w)return;
    const MN=["January","February","March","April","May","June","July","August","September","October","November","December"];
    const monthName=MN[thisMonth];
    const prevMonthName=MN[prevMonth];

    // ── Data ────────────────────────────────────────────────────────────────
    // PO received this month
    const poThisMonth=allOrders.filter((o:any)=>{ const d=o.date?new Date(o.date+"T00:00:00"):null; return d&&d.getMonth()===thisMonth&&d.getFullYear()===thisYear; });
    const poThisMonthAmt=poThisMonth.reduce((s:number,o:any)=>s+(+o.amount||0),0);

    // Invoices this month
    const invThisMonth=allInvoices.filter((i:any)=>{ const d=i.date?new Date(i.date+"T00:00:00"):null; return d&&d.getMonth()===thisMonth&&d.getFullYear()===thisYear; });
    const invThisMonthAmt=invThisMonth.reduce((s:number,i:any)=>s+(+i.amount||0),0);

    // Payments received this month
    const allPayments=allOrders.flatMap((o:any)=>(o.invoices||[]).flatMap((i:any)=>(i.payments||[]).map((p:any)=>({...p,_client:o._client,_po:o.poNumber,_inv:i.invoiceNumber}))));
    const payThisMonth=allPayments.filter((p:any)=>{ const d=p.date?new Date(p.date+"T00:00:00"):null; return d&&d.getMonth()===thisMonth&&d.getFullYear()===thisYear; });
    const payThisMonthAmt=payThisMonth.reduce((s:number,p:any)=>s+(+p.amount||0),0);

    // Overdue invoices
    const overdueInv=allInvoices.filter((i:any)=>{ const ps=payStatus(i); return["overdue","ov_part"].includes(ps.key); });
    const overdueAmt=overdueInv.reduce((s:number,i:any)=>s+payStatus(i).rem,0);

    // Upcoming (next 30 days)
    const upcomingInv=allInvoices.filter((i:any)=>{ const ps=payStatus(i); return["today","soon","soon_part"].includes(ps.key); });
    const upcomingAmt=upcomingInv.reduce((s:number,i:any)=>s+payStatus(i).rem,0);

    // YTD
    const ytdPO=allOrders.filter((o:any)=>{ const d=o.date?new Date(o.date+"T00:00:00"):null; return d&&d.getFullYear()===thisYear; }).reduce((s:number,o:any)=>s+(+o.amount||0),0);
    const ytdInv=allInvoices.filter((i:any)=>{ const d=i.date?new Date(i.date+"T00:00:00"):null; return d&&d.getFullYear()===thisYear; }).reduce((s:number,i:any)=>s+(+i.amount||0),0);
    const ytdPay=allPayments.filter((p:any)=>{ const d=p.date?new Date(p.date+"T00:00:00"):null; return d&&d.getFullYear()===thisYear; }).reduce((s:number,p:any)=>s+(+p.amount||0),0);

    // Invoicing rate
    const invRate=ytdPO>0?(ytdInv/ytdPO*100):0;
    const collRate=ytdInv>0?(ytdPay/ytdInv*100):0;
    const monthInvRate=poThisMonthAmt>0?(invThisMonthAmt/poThisMonthAmt*100):0;

    // By client this month
    const byClientPO:Record<string,number>={};
    poThisMonth.forEach((o:any)=>{ byClientPO[o._client]=(byClientPO[o._client]||0)+(+o.amount||0); });
    const byClientInv:Record<string,number>={};
    invThisMonth.forEach((i:any)=>{ byClientInv[i._client]=(byClientInv[i._client]||0)+(+i.amount||0); });
    const byClientPay:Record<string,number>={};
    payThisMonth.forEach((p:any)=>{ byClientPay[p._client]=(byClientPay[p._client]||0)+(+p.amount||0); });

    // Prev month comparison
    const poLastMonth=allOrders.filter((o:any)=>{ const d=o.date?new Date(o.date+"T00:00:00"):null; return d&&d.getMonth()===prevMonth&&d.getFullYear()===prevMonthYear; }).reduce((s:number,o:any)=>s+(+o.amount||0),0);
    const invLastMonth=invoicedPrevMonth;
    const payLastMonth=allPayments.filter((p:any)=>{ const d=p.date?new Date(p.date+"T00:00:00"):null; return d&&d.getMonth()===prevMonth&&d.getFullYear()===prevMonthYear; }).reduce((s:number,p:any)=>s+(+p.amount||0),0);

    const arrow=(curr:number,prev:number)=>{ if(!prev)return""; const pct=((curr-prev)/prev*100); const up=pct>=0; return `<span style="font-size:10px;font-weight:700;color:${up?"#059669":"#DC2626"};margin-left:6px">${up?"▲":"▼"} ${Math.abs(pct).toFixed(0)}% vs ${prevMonthName}</span>`; };

    const genDate=today.toLocaleDateString("en-GB",{weekday:"long",year:"numeric",month:"long",day:"numeric"});

    w.document.write(`<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8">
<title>Monthly Report — ${monthName} ${thisYear}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:#0D1B2A;background:#fff;}
@page{size:A4 portrait;margin:10mm 12mm;}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;} .no-print{display:none!important} .page{page-break-after:always;break-after:page;} .page:last-child{page-break-after:avoid;}}
.page{padding:10mm 12mm 14mm;position:relative;min-height:277mm;}
.no-print{position:fixed;top:12px;right:12px;z-index:999;display:flex;gap:8px;}

/* Cover */
.cover{background:linear-gradient(135deg,#0D1B2A 0%,#0D9488 60%,#0369A1 100%);color:#fff;display:flex;flex-direction:column;justify-content:space-between;}
.brand{font-size:11px;opacity:.5;letter-spacing:.1em;text-transform:uppercase;}
.main-title{font-size:38px;font-weight:900;line-height:1;letter-spacing:-.02em;margin-top:8px;}
.month-badge{font-size:14px;opacity:.75;margin-top:6px;}
.watermark{font-size:80px;font-weight:900;color:rgba(255,255,255,.06);position:absolute;right:10mm;top:50%;transform:translateY(-50%);letter-spacing:-.04em;}
.cover-kpi{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:0;}
.ck{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:10px;padding:10px 14px;}
.ck-label{font-size:9px;opacity:.6;text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px;}
.ck-val{font-size:20px;font-weight:900;}
.ck-sub{font-size:9px;opacity:.55;margin-top:3px;}
.cover-footer{font-size:9px;opacity:.45;display:flex;justify-content:space-between;}

/* Section header */
.sh{border-bottom:3px solid #0D1B2A;padding-bottom:8px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:flex-end;}
.sh-title{font-size:18px;font-weight:900;color:#0D1B2A;}
.sh-sub{font-size:11px;color:#8FA0B3;margin-top:2px;}
.sh-badge{font-size:10px;font-weight:600;padding:3px 10px;border-radius:4px;}

/* KPI grid */
.kpi-grid{display:grid;gap:10px;margin-bottom:16px;}
.kpi-3{grid-template-columns:repeat(3,1fr);}
.kpi-4{grid-template-columns:repeat(4,1fr);}
.kpi{border-radius:10px;padding:12px 14px;border:1px solid #E5EAF0;}
.kpi-label{font-size:9px;color:#8FA0B3;font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;}
.kpi-val{font-size:20px;font-weight:900;line-height:1;}
.kpi-sub{font-size:9px;color:#8FA0B3;margin-top:4px;}
.kpi-bar{height:4px;border-radius:99px;background:#E5EAF0;margin-top:8px;overflow:hidden;}
.kpi-bar-fill{height:100%;border-radius:99px;}

/* Progress ring placeholder — use simple bar */
.gauge-row{display:flex;gap:16px;align-items:center;margin-bottom:14px;}
.gauge{flex:1;background:#F8FAFC;border-radius:10px;border:1px solid #E5EAF0;padding:12px 14px;}
.gauge-label{font-size:9px;color:#8FA0B3;font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;}
.gauge-val{font-size:22px;font-weight:900;margin-bottom:6px;}
.bar{height:8px;border-radius:99px;background:#E5EAF0;overflow:hidden;}
.bar-fill{height:100%;border-radius:99px;transition:width .4s;}

/* Tables */
table{width:100%;border-collapse:collapse;font-size:10px;margin-bottom:14px;}
th{background:#0D1B2A;color:#fff;padding:6px 8px;text-align:left;font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;}
td{padding:5px 8px;border-bottom:1px solid #E5EAF0;vertical-align:middle;}
tr:nth-child(even) td{background:#F8FAFC;}
.total-row td{background:#0D1B2A!important;color:#fff!important;font-weight:700;}
.section-label td{background:#F0FDFA!important;color:#0D9488!important;font-weight:700;font-size:9px;text-transform:uppercase;letter-spacing:.05em;}
.alert-row td{background:#FEF2F2!important;border-left:3px solid #DC2626;}

/* Two col */
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.col-title{font-size:10px;font-weight:700;color:#0D1B2A;padding:5px 0;border-bottom:2px solid #0D1B2A;margin-bottom:8px;text-transform:uppercase;letter-spacing:.04em;}

/* Analysis box */
.analysis{background:#F0FDFA;border-left:4px solid #0D9488;border-radius:0 8px 8px 0;padding:10px 14px;margin-bottom:12px;}
.analysis-title{font-size:10px;font-weight:700;color:#0D9488;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em;}
.analysis-item{font-size:10px;color:#0D1B2A;padding:3px 0;display:flex;gap:6px;}
.dot{width:6px;height:6px;border-radius:99px;background:#0D9488;flex-shrink:0;margin-top:3px;}
.warn-box{background:#FEF9EC;border-left:4px solid #D97706;border-radius:0 8px 8px 0;padding:10px 14px;margin-bottom:12px;}
.warn-title{font-size:10px;font-weight:700;color:#D97706;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em;}
.alert-box{background:#FEF2F2;border-left:4px solid #DC2626;border-radius:0 8px 8px 0;padding:10px 14px;margin-bottom:12px;}
.alert-title{font-size:10px;font-weight:700;color:#DC2626;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em;}

/* Footer */
.footer{position:absolute;bottom:8mm;left:12mm;right:12mm;display:flex;justify-content:space-between;font-size:9px;color:#8FA0B3;border-top:1px solid #E5EAF0;padding-top:5px;}
</style>
</head><body>

<div class="no-print">
  <button onclick="window.print()" style="background:#0D9488;color:#fff;border:none;border-radius:8px;padding:10px 20px;font-size:13px;font-weight:700;cursor:pointer;font-family:Arial;box-shadow:0 2px 8px rgba(0,0,0,.3)">🖨️ Print / PDF</button>
  <button onclick="window.close()" style="background:#6B7280;color:#fff;border:none;border-radius:8px;padding:10px 16px;font-size:13px;font-weight:700;cursor:pointer;font-family:Arial">✕ Close</button>
</div>

<!-- ══ PAGE 1: COVER ══ -->
<div class="page cover">
  <div>
    <div class="brand">OrderTrack — Monthly Performance Report</div>
    <div style="margin-top:14px">
      <div class="main-title">MONTHLY<br>REPORT</div>
      <div class="month-badge">${monthName} ${thisYear} · West Africa</div>
    </div>
  </div>
  <div class="watermark">${monthName.slice(0,3).toUpperCase()}</div>
  <div>
    <div class="cover-kpi">
      <div class="ck"><div class="ck-label">PO Received (${monthName})</div><div class="ck-val">${fmtK(poThisMonthAmt)} €</div><div class="ck-sub">${poThisMonth.length} order${poThisMonth.length>1?"s":""}</div></div>
      <div class="ck"><div class="ck-label">Invoiced (${monthName})</div><div class="ck-val">${fmtK(invThisMonthAmt)} €</div><div class="ck-sub">${invThisMonth.length} invoice${invThisMonth.length>1?"s":""}</div></div>
      <div class="ck"><div class="ck-label">Collected (${monthName})</div><div class="ck-val">${fmtK(payThisMonthAmt)} €</div><div class="ck-sub">${payThisMonth.length} payment${payThisMonth.length>1?"s":""}</div></div>
      <div class="ck"><div class="ck-label">YTD Orders</div><div class="ck-val">${fmtK(ytdPO)} €</div><div class="ck-sub">Since Jan 1st</div></div>
      <div class="ck"><div class="ck-label">YTD Invoiced</div><div class="ck-val">${fmtK(ytdInv)} €</div><div class="ck-sub">${invRate.toFixed(1)}% of PO</div></div>
      <div class="ck"><div class="ck-label">Open Orders</div><div class="ck-val">${fmtK(openOrders)} €</div><div class="ck-sub">Remaining to invoice</div></div>
    </div>
  </div>
  <div class="cover-footer">
    <span>CONFIDENTIAL — Internal use only</span>
    <span>Generated on ${genDate}</span>
  </div>
  <div class="footer"><span></span></div>
</div>

<!-- ══ PAGE 2: KPI & ANALYSIS ══ -->
<div class="page">
  <div class="sh">
    <div><div class="sh-title">📊 Performance Overview — ${monthName} ${thisYear}</div><div class="sh-sub">Key indicators and comparative analysis</div></div>
    <span class="sh-badge" style="background:#CCFBF1;color:#0D9488">${monthName} ${thisYear}</span>
  </div>

  <!-- Month vs prev month -->
  <div class="kpi-grid kpi-3" style="margin-bottom:12px">
    <div class="kpi" style="border-left:4px solid #2563EB;background:#EFF6FF">
      <div class="kpi-label">PO Received</div>
      <div class="kpi-val" style="color:#2563EB">${fmtK(poThisMonthAmt)} €</div>
      ${arrow(poThisMonthAmt,poLastMonth)}
      <div class="kpi-sub">${poThisMonth.length} order${poThisMonth.length>1?"s":""} · Previous: ${fmtK(poLastMonth)} €</div>
      <div class="kpi-bar"><div class="kpi-bar-fill" style="width:${Math.min(100,poLastMonth>0?poThisMonthAmt/poLastMonth*100:100)}%;background:#2563EB"></div></div>
    </div>
    <div class="kpi" style="border-left:4px solid #0D9488;background:#F0FDFA">
      <div class="kpi-label">Invoiced</div>
      <div class="kpi-val" style="color:#0D9488">${fmtK(invThisMonthAmt)} €</div>
      ${arrow(invThisMonthAmt,invLastMonth)}
      <div class="kpi-sub">${invThisMonth.length} invoice${invThisMonth.length>1?"s":""} · Previous: ${fmtK(invLastMonth)} €</div>
      <div class="kpi-bar"><div class="kpi-bar-fill" style="width:${Math.min(100,invLastMonth>0?invThisMonthAmt/invLastMonth*100:100)}%;background:#0D9488"></div></div>
    </div>
    <div class="kpi" style="border-left:4px solid #059669;background:#F0FDF4">
      <div class="kpi-label">Collected</div>
      <div class="kpi-val" style="color:#059669">${fmtK(payThisMonthAmt)} €</div>
      ${arrow(payThisMonthAmt,payLastMonth)}
      <div class="kpi-sub">${payThisMonth.length} payment${payThisMonth.length>1?"s":""} · Previous: ${fmtK(payLastMonth)} €</div>
      <div class="kpi-bar"><div class="kpi-bar-fill" style="width:${Math.min(100,payLastMonth>0?payThisMonthAmt/payLastMonth*100:100)}%;background:#059669"></div></div>
    </div>
  </div>

  <!-- YTD rates -->
  <div class="gauge-row">
    <div class="gauge">
      <div class="gauge-label">📈 YTD Invoicing Rate</div>
      <div class="gauge-val" style="color:${invRate>=80?"#059669":invRate>=50?"#D97706":"#DC2626"}">${invRate.toFixed(1)}%</div>
      <div class="bar"><div class="bar-fill" style="width:${Math.min(100,invRate)}%;background:${invRate>=80?"#059669":invRate>=50?"#D97706":"#DC2626"}"></div></div>
      <div style="font-size:9px;color:#8FA0B3;margin-top:4px">${fmtK(ytdInv)} € invoiced out of ${fmtK(ytdPO)} € ordered</div>
    </div>
    <div class="gauge">
      <div class="gauge-label">💰 YTD Collection Rate</div>
      <div class="gauge-val" style="color:${collRate>=80?"#059669":collRate>=50?"#D97706":"#DC2626"}">${collRate.toFixed(1)}%</div>
      <div class="bar"><div class="bar-fill" style="width:${Math.min(100,collRate)}%;background:${collRate>=80?"#059669":collRate>=50?"#D97706":"#DC2626"}"></div></div>
      <div style="font-size:9px;color:#8FA0B3;margin-top:4px">${fmtK(ytdPay)} € collected out of ${fmtK(ytdInv)} € invoiced</div>
    </div>
    <div class="gauge">
      <div class="gauge-label">📦 Open Orders</div>
      <div class="gauge-val" style="color:#D97706">${fmtK(openOrders)} €</div>
      <div class="bar"><div class="bar-fill" style="width:${Math.min(100,ytdPO>0?openOrders/ytdPO*100:0)}%;background:#D97706"></div></div>
      <div style="font-size:9px;color:#8FA0B3;margin-top:4px">Remaining to invoice on all orders</div>
    </div>
  </div>

  <!-- Analysis -->
  ${overdueAmt>0?`<div class="alert-box"><div class="alert-title">⚠ Alert — Overdue Invoices</div>${overdueInv.slice(0,3).map((i:any)=>{const ps=payStatus(i);const days=i.dueDate?Math.abs(diffD(i.dueDate)):0;return`<div class="analysis-item"><div class="dot" style="background:#DC2626"></div><span><b>${i._client}</b> — ${i.invoiceNumber||i._po||"—"} · ${fmt(ps.rem)} € overdue by ${days} day${days>1?"s":""}</span></div>`;}).join("")}${overdueInv.length>3?`<div style="font-size:9px;color:#DC2626;margin-top:4px">+ ${overdueInv.length-3} more overdue invoice${overdueInv.length-3>1?"s":""} · Total: ${fmt(overdueAmt)} €</div>`:""}</div>`:""}

  ${invRate>=80?`<div class="analysis"><div class="analysis-title">✅ Strong Invoicing Performance</div><div class="analysis-item"><div class="dot"></div><span>YTD invoicing rate of ${invRate.toFixed(1)}% is excellent — above the 80% target.</span></div><div class="analysis-item"><div class="dot"></div><span>Month-on-month invoiced: ${fmtK(invThisMonthAmt)} € (${invLastMonth>0?(((invThisMonthAmt-invLastMonth)/invLastMonth)*100).toFixed(0):"—"}% vs ${prevMonthName}).</span></div></div>`:invRate>=50?`<div class="warn-box"><div class="warn-title">⚡ Invoicing Needs Attention</div><div class="analysis-item"><div class="dot" style="background:#D97706"></div><span>YTD invoicing rate of ${invRate.toFixed(1)}% is below the 80% target. ${fmtK(ytdPO-ytdInv)} € still to invoice.</span></div><div class="analysis-item"><div class="dot" style="background:#D97706"></div><span>Open orders: ${fmtK(openOrders)} € — acceleration recommended.</span></div></div>`:`<div class="alert-box"><div class="alert-title">🔴 Low Invoicing Rate</div><div class="analysis-item"><div class="dot" style="background:#DC2626"></div><span>Only ${invRate.toFixed(1)}% of orders invoiced YTD — significant catch-up needed.</span></div></div>`}

  ${upcomingAmt>0?`<div class="analysis"><div class="analysis-title">🔔 Upcoming Collections (next 30 days)</div>${upcomingInv.slice(0,4).map((i:any)=>{const ps=payStatus(i);return`<div class="analysis-item"><div class="dot"></div><span><b>${i._client}</b> — ${i.invoiceNumber||"—"} · ${fmt(ps.rem)} € due ${fmtD(i.dueDate)}</span></div>`;}).join("")}<div style="font-size:9px;color:#0D9488;margin-top:4px;font-weight:600">Total upcoming: ${fmt(upcomingAmt)} €</div></div>`:""}

  <div class="footer"><span>Performance Overview — ${monthName} ${thisYear}</span><span>1 / 3</span></div>
</div>

<!-- ══ PAGE 3: PO & INVOICES ══ -->
<div class="page">
  <div class="sh">
    <div><div class="sh-title">📦 Orders & Invoices — ${monthName} ${thisYear}</div><div class="sh-sub">Purchase orders received and invoices issued this month</div></div>
    <span class="sh-badge" style="background:#DBEAFE;color:#1D4ED8">${monthName} ${thisYear}</span>
  </div>
  <div class="two-col">
    <div>
      <div class="col-title">📦 PO Received — ${monthName}</div>
      <table>
        <thead><tr><th>Customer</th><th>S/O #</th><th>Date</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody>
          ${poThisMonth.length===0?'<tr><td colspan="4" style="text-align:center;color:#8FA0B3;padding:12px">No orders received this month</td></tr>':
            (()=>{
              const sorted=[...poThisMonth].sort((a:any,b:any)=>(a.date||"").localeCompare(b.date||""));
              const byC:Record<string,any[]>={};
              sorted.forEach((o:any)=>{ if(!byC[o._client])byC[o._client]=[]; byC[o._client].push(o); });
              let r="";
              Object.keys(byC).sort().forEach(c=>{
                const cTot=byC[c].reduce((s:number,o:any)=>s+(+o.amount||0),0);
                r+=`<tr class="section-label"><td colspan="3">📁 ${c}</td><td style="text-align:right">${fmtK(cTot)} €</td></tr>`;
                byC[c].forEach((o:any)=>{ r+=`<tr><td style="padding-left:12px;color:#4A5568;font-size:9px">${o.soNumber||"—"}</td><td style="font-size:9px;color:#6B7280">${o.poNumber||"—"}</td><td style="color:#8FA0B3">${fmtD(o.date)}</td><td style="text-align:right;font-weight:600;color:#2563EB">${fmtK(+o.amount||0)} €</td></tr>`; });
              });
              r+=`<tr class="total-row"><td colspan="3">TOTAL</td><td style="text-align:right">${fmtK(poThisMonthAmt)} €</td></tr>`;
              return r;
            })()
          }
        </tbody>
      </table>
    </div>
    <div>
      <div class="col-title">🧾 Invoices Issued — ${monthName}</div>
      <table>
        <thead><tr><th>Customer</th><th>Invoice #</th><th>Due date</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody>
          ${invThisMonth.length===0?'<tr><td colspan="4" style="text-align:center;color:#8FA0B3;padding:12px">No invoices issued this month</td></tr>':
            (()=>{
              const sorted=[...invThisMonth].sort((a:any,b:any)=>(a.date||"").localeCompare(b.date||""));
              const byC2:Record<string,any[]>={};
              sorted.forEach((i:any)=>{ if(!byC2[i._client])byC2[i._client]=[]; byC2[i._client].push(i); });
              let r2="";
              Object.keys(byC2).sort().forEach(c=>{
                const cTot=byC2[c].reduce((s:number,i:any)=>s+(+i.amount||0),0);
                r2+=`<tr class="section-label"><td colspan="3">📁 ${c}</td><td style="text-align:right">${fmtK(cTot)} €</td></tr>`;
                byC2[c].forEach((i:any)=>{ const ps=payStatus(i); r2+=`<tr><td style="padding-left:12px;color:#4A5568;font-size:9px">${i.invoiceNumber||"—"}</td><td style="font-size:9px">${i._po||"—"}</td><td style="color:${ps.key.includes("over")?"#DC2626":"#8FA0B3"}">${fmtD(i.dueDate)}</td><td style="text-align:right;font-weight:600;color:#0D9488">${fmtK(+i.amount||0)} €</td></tr>`; });
              });
              r2+=`<tr class="total-row"><td colspan="3">TOTAL</td><td style="text-align:right">${fmtK(invThisMonthAmt)} €</td></tr>`;
              return r2;
            })()
          }
        </tbody>
      </table>
    </div>
  </div>
  <div class="footer"><span>Orders & Invoices — ${monthName} ${thisYear}</span><span>2 / 3</span></div>
</div>

<!-- ══ PAGE 4: COLLECTIONS & OUTSTANDING ══ -->
<div class="page">
  <div class="sh">
    <div><div class="sh-title">💰 Collections & Outstanding — ${monthName} ${thisYear}</div><div class="sh-sub">Payments received and outstanding balances</div></div>
    <span class="sh-badge" style="background:#D1FAE5;color:#065F46">${monthName} ${thisYear}</span>
  </div>
  <div class="two-col">
    <div>
      <div class="col-title">✅ Payments Received — ${monthName}</div>
      <table>
        <thead><tr><th>Customer</th><th>Invoice #</th><th>Date</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody>
          ${payThisMonth.length===0?'<tr><td colspan="4" style="text-align:center;color:#8FA0B3;padding:12px">No payments received this month</td></tr>':
            (()=>{
              const sorted=[...payThisMonth].sort((a:any,b:any)=>(a.date||"").localeCompare(b.date||""));
              const byC3:Record<string,any[]>={};
              sorted.forEach((p:any)=>{ if(!byC3[p._client])byC3[p._client]=[]; byC3[p._client].push(p); });
              let r3="";
              Object.keys(byC3).sort().forEach(c=>{
                const cTot=byC3[c].reduce((s:number,p:any)=>s+(+p.amount||0),0);
                r3+=`<tr class="section-label"><td colspan="3">📁 ${c}</td><td style="text-align:right">${fmtK(cTot)} €</td></tr>`;
                byC3[c].forEach((p:any)=>{ r3+=`<tr><td style="padding-left:12px;font-size:9px;color:#4A5568">${p._inv||"—"}</td><td style="font-size:9px;color:#6B7280">${p.reference||p.method||"—"}</td><td style="color:#8FA0B3">${fmtD(p.date)}</td><td style="text-align:right;font-weight:600;color:#059669">${fmtK(+p.amount||0)} €</td></tr>`; });
              });
              r3+=`<tr class="total-row"><td colspan="3">TOTAL COLLECTED</td><td style="text-align:right">${fmtK(payThisMonthAmt)} €</td></tr>`;
              return r3;
            })()
          }
        </tbody>
      </table>
    </div>
    <div>
      <div class="col-title">⚠ Outstanding — Overdue Invoices</div>
      <table>
        <thead><tr><th>Customer</th><th>Invoice #</th><th>Overdue</th><th style="text-align:right">Balance</th></tr></thead>
        <tbody>
          ${overdueInv.length===0?'<tr><td colspan="4" style="text-align:center;color:#059669;padding:12px">✓ No overdue invoices</td></tr>':
            (()=>{
              const sorted=[...overdueInv].sort((a:any,b:any)=>(a.dueDate||"").localeCompare(b.dueDate||""));
              let r4=sorted.map((i:any)=>{
                const ps=payStatus(i);
                const days=i.dueDate?Math.abs(diffD(i.dueDate)):0;
                const urg=days>90?"#B91C1C":days>30?"#DC2626":"#EF4444";
                return`<tr class="${days>30?"alert-row":""}"><td style="font-weight:700">${i._client}</td><td style="font-size:9px">${i.invoiceNumber||"—"}</td><td style="text-align:center"><span style="background:${urg};color:#fff;padding:2px 6px;border-radius:3px;font-size:9px;font-weight:700">${days}d</span></td><td style="text-align:right;font-weight:700;color:${urg}">${fmtK(ps.rem)} €</td></tr>`;
              }).join("");
              r4+=`<tr class="total-row"><td colspan="3">TOTAL OVERDUE</td><td style="text-align:right;color:#FCA5A5">${fmtK(overdueAmt)} €</td></tr>`;
              return r4;
            })()
          }
        </tbody>
      </table>

      <div class="col-title" style="margin-top:8px">🔔 Upcoming Due (next 30 days)</div>
      <table>
        <thead><tr><th>Customer</th><th>Invoice #</th><th>Due date</th><th style="text-align:right">Balance</th></tr></thead>
        <tbody>
          ${upcomingInv.length===0?'<tr><td colspan="4" style="text-align:center;color:#8FA0B3;padding:12px">No upcoming due dates</td></tr>':
            (()=>{
              const sorted=[...upcomingInv].sort((a:any,b:any)=>(a.dueDate||"").localeCompare(b.dueDate||""));
              let r5=sorted.slice(0,6).map((i:any)=>{
                const ps=payStatus(i);
                const days=diffD(i.dueDate||"");
                return`<tr><td style="font-weight:600">${i._client}</td><td style="font-size:9px">${i.invoiceNumber||"—"}</td><td style="color:#0369A1;font-weight:600">${fmtD(i.dueDate)} <span style="font-size:9px;color:#8FA0B3">(${days}d)</span></td><td style="text-align:right;font-weight:600;color:#0369A1">${fmtK(ps.rem)} €</td></tr>`;
              }).join("");
              if(upcomingInv.length>6) r5+=`<tr><td colspan="4" style="text-align:center;color:#8FA0B3;font-size:9px">+ ${upcomingInv.length-6} more — Total: ${fmt(upcomingAmt)} €</td></tr>`;
              r5+=`<tr class="total-row"><td colspan="3">TOTAL UPCOMING</td><td style="text-align:right">${fmtK(upcomingAmt)} €</td></tr>`;
              return r5;
            })()
          }
        </tbody>
      </table>
    </div>
  </div>

  <!-- Summary by client -->
  <div class="col-title">📊 Monthly Summary by Customer</div>
  <table>
    <thead><tr><th>Customer</th><th style="text-align:right">PO Received</th><th style="text-align:right">Invoiced</th><th style="text-align:right">Collected</th><th style="text-align:right">Open Orders</th><th style="text-align:right">Inv. Rate</th></tr></thead>
    <tbody>
      ${(()=>{
        const clients2=Array.from(new Set([...Object.keys(byClientPO),...Object.keys(byClientInv),...Object.keys(byClientPay)])).sort();
        let r6=clients2.map(c=>{
          const po=byClientPO[c]||0, inv=byClientInv[c]||0, pay=byClientPay[c]||0;
          const openC=allOrders.filter((o:any)=>o._client===c).reduce((s:number,o:any)=>{ const i=(o.invoices||[]).reduce((ss:number,iv:any)=>ss+(+iv.amount||0),0); return s+Math.max(0,(+o.amount||0)-i); },0);
          const rate=po>0?(inv/po*100):0;
          const rc=rate>=80?"#059669":rate>=50?"#D97706":"#DC2626";
          return`<tr><td style="font-weight:700">${c}</td><td style="text-align:right;color:#2563EB">${po>0?fmtK(po)+" €":"—"}</td><td style="text-align:right;color:#0D9488">${inv>0?fmtK(inv)+" €":"—"}</td><td style="text-align:right;color:#059669">${pay>0?fmtK(pay)+" €":"—"}</td><td style="text-align:right;color:#D97706">${openC>0?fmtK(openC)+" €":"—"}</td><td style="text-align:right;font-weight:700;color:${rc}">${po>0?rate.toFixed(0)+"%":"—"}</td></tr>`;
        }).join("");
        r6+=`<tr class="total-row"><td>TOTAL</td><td style="text-align:right">${fmtK(poThisMonthAmt)} €</td><td style="text-align:right">${fmtK(invThisMonthAmt)} €</td><td style="text-align:right">${fmtK(payThisMonthAmt)} €</td><td style="text-align:right">${fmtK(openOrders)} €</td><td style="text-align:right">${monthInvRate.toFixed(0)}%</td></tr>`;
        return r6;
      })()}
    </tbody>
  </table>
  <div class="footer"><span>Collections & Outstanding — ${monthName} ${thisYear}</span><span>3 / 3</span></div>
</div>

</body></html>`);
    w.document.close();
  };

  const printReport=()=>{
    const prevMonthName=MONTH_NAMES[prevMonth];
    const thisMonthName=MONTH_NAMES[thisMonth];
    const priorityColor=(p:string)=>p==="HIGH"?"#DC2626":p==="MEDIUM"?"#D97706":"#059669";
    const priorityBg=(p:string)=>p==="HIGH"?"#FEE2E2":p==="MEDIUM"?"#FEF3C7":"#D1FAE5";

    const w=window.open("","_blank","width=1200,height=900");
    if(!w)return;
    w.document.write(`<!DOCTYPE html><html><head>
<meta charset="utf-8">
<title>Weekly Report ${weekLabel} — ${period}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:#0D1B2A;background:#fff;}
  .page{width:297mm;padding:10mm 12mm 14mm;display:flex;flex-direction:column;page-break-after:always;position:relative;break-after:page;}
  .page:last-child{page-break-after:avoid;break-after:avoid;}
  
  /* Cover page */
  .cover{background:linear-gradient(135deg,#0D1B2A 0%,#1E3A5F 60%,#2563EB 100%);color:#fff;justify-content:space-between;}
  .cover-logo{font-size:11px;opacity:.5;letter-spacing:.1em;text-transform:uppercase;}
  .cover-title{font-size:34px;font-weight:900;letter-spacing:-.02em;line-height:1;}
  .cover-sub{font-size:16px;opacity:.75;margin-top:8px;}
  .cover-week{font-size:56px;font-weight:900;color:rgba(255,255,255,.1);position:absolute;right:12mm;top:50%;transform:translateY(-50%);}
  .cover-meta{display:flex;gap:24px;align-items:center;}
  .cover-badge{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:6px;padding:6px 14px;font-size:13px;font-weight:600;}
  .cover-toc{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:0;}
  .toc-item{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:8px;padding:7px 12px;display:flex;align-items:center;gap:8px;}
  .toc-num{font-size:24px;font-weight:900;opacity:.3;}
  .toc-label{font-size:12px;font-weight:600;}

  /* Section pages */
  .section-header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:7px;border-bottom:3px solid #0D1B2A;margin-bottom:10px;}
  .section-title{font-size:18px;font-weight:900;color:#0D1B2A;letter-spacing:-.01em;}
  .section-sub{font-size:12px;color:#8FA0B3;margin-top:2px;}
  .section-meta{text-align:right;font-size:10px;color:#8FA0B3;}
  .section-badge{font-size:11px;font-weight:600;color:#2563EB;background:#DBEAFE;padding:3px 10px;border-radius:4px;}

  /* KPI cards */
  .kpi-row{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px;}
  .kpi{background:#F8FAFC;border:1px solid #E5EAF0;border-radius:8px;padding:8px 12px;}
  .kpi-label{font-size:9px;color:#8FA0B3;font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;}
  .kpi-val{font-size:18px;font-weight:800;color:#0D1B2A;}
  .kpi-sub{font-size:9px;color:#8FA0B3;margin-top:2px;}

  /* Tables */
  table{width:100%;border-collapse:collapse;font-size:10px;}
  th{background:#0D1B2A;color:#fff;padding:5px 8px;text-align:left;font-weight:600;font-size:9px;text-transform:uppercase;letter-spacing:.05em;}
  td{padding:5px 8px;border-bottom:1px solid #E5EAF0;vertical-align:middle;}
  tr:nth-child(even) td{background:#F8FAFC;}
  .subtotal td{background:#EFF6FF!important;font-weight:700;color:#1D4ED8;}
  .total-row td{background:#0D1B2A!important;color:#fff!important;font-weight:700;}

  /* Activity */
  .activity-row{display:flex;gap:8px;align-items:flex-start;padding:5px 0;border-bottom:1px solid #F1F5F9;}
  .priority-badge{padding:3px 8px;border-radius:4px;font-size:9px;font-weight:700;text-transform:uppercase;white-space:nowrap;flex-shrink:0;}
  .status-icon{font-size:14px;flex-shrink:0;}
  .activity-content{flex:1;}
  .activity-client{font-weight:700;font-size:11px;color:#0D1B2A;}
  .activity-desc{font-size:10px;color:#4A5568;margin-top:1px;}

  /* Two column layout */
  .two-col{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
  .col-header{font-size:10px;font-weight:700;color:#0D1B2A;padding:4px 0;border-bottom:2px solid #0D1B2A;margin-bottom:6px;}

  /* Footer */
  .footer{position:absolute;bottom:8mm;left:14mm;right:14mm;display:flex;justify-content:space-between;font-size:9px;color:#8FA0B3;border-top:1px solid #E5EAF0;padding-top:6px;}

  @media print{
    body{-webkit-print-color-adjust:exact;print-color-adjust:exact;font-size:10px;}
    .page{page-break-after:always;break-after:page;}
    .page:last-child{page-break-after:avoid;}
  }
</style>
</head><body>

<!-- ══ PAGE 1: COVER ══ -->
<div class="page cover">
  <div>
    <div class="cover-logo">OrderTrack — Commercial Report</div>
    <div style="margin-top:10px">
      <div class="cover-title">WEEKLY<br>REPORT</div>
      <div class="cover-sub">Commercial Activity Summary</div>
    </div>
  </div>
  <div class="cover-week">${weekLabel}</div>
  <div>
    <div class="cover-meta" style="margin-bottom:10px">
      <div class="cover-badge">📅 ${period}</div>
      <div class="cover-badge">📍 West Africa — Côte d'Ivoire</div>
      <div class="cover-badge">Week ${weekLabel}</div>
    </div>
    <div class="cover-toc">
      <div class="toc-item"><span class="toc-num">1</span><span class="toc-label">Order Intake<br><small style="opacity:.6">Orders received</small></span></div>
      <div class="toc-item"><span class="toc-num">2</span><span class="toc-label">Invoicing<br><small style="opacity:.6">Monthly invoicing</small></span></div>
      <div class="toc-item"><span class="toc-num">3</span><span class="toc-label">Last Week<br><small style="opacity:.6">Last week activities</small></span></div>
      <div class="toc-item"><span class="toc-num">4</span><span class="toc-label">This Week<br><small style="opacity:.6">Current week activities</small></span></div>
    </div>
  </div>
  <div class="footer">
    <span>CONFIDENTIAL — Internal use only</span>
    <span>Generated on ${today.toLocaleDateString("en-GB",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</span>
  </div>
</div>

<!-- ══ PAGE 2: ORDER INTAKE ══ -->
<div class="page">
  <div class="section-header">
    <div>
      <div style="font-size:10px;color:#2563EB;font-weight:600;letter-spacing:.08em;text-transform:uppercase;margin-bottom:4px">1 / 4</div>
      <div class="section-title">📦 ORDER INTAKE</div>
      <div class="section-sub">— ${period} · Orders received sur ${periodLabel}</div>
    </div>
    <div class="section-meta">
      <div class="section-badge">${weekLabel} · ${period}</div>
      <div style="margin-top:4px">West Africa</div>
    </div>
  </div>

  <div class="kpi-row">
    <div class="kpi" style="border-left:4px solid #2563EB">
      <div class="kpi-label">Orders Received (${periodLabel})</div>
      <div class="kpi-val" style="color:#2563EB">${fmtK(recentOrdersAmt)} €</div>
      <div class="kpi-sub">${recentOrders.length} order${recentOrders.length>1?"s":""} in the last ${periodLabel}</div>
    </div>
    <div class="kpi" style="border-left:4px solid #D97706">
      <div class="kpi-label">Expected Orders</div>
      <div class="kpi-val" style="color:#D97706">${fmtK(expectedOrders.filter((e:any)=>e.est).reduce((s:number,e:any)=>s+(+e.est||0)*1000,0))} €</div>
      <div class="kpi-sub">${expectedOrders.filter((e:any)=>e.client||e.project).length} order${expectedOrders.filter((e:any)=>e.client||e.project).length>1?"s":""} expected</div>
    </div>
    <div class="kpi" style="border-left:4px solid #059669">
      <div class="kpi-label">Total ${year} (YTD)</div>
      <div class="kpi-val" style="color:#059669">${fmtK(allOrders.reduce((s:number,o:any)=>{const d=o.date?new Date(o.date+"T00:00:00"):null;return d&&d.getFullYear()===thisYear?s+(+o.amount||0):s;},0))} €</div>
      <div class="kpi-sub">Since January 1st, ${year}</div>
    </div>
  </div>

  <div class="two-col">
    <div>
      <div class="col-header">📦 ORDERS RECEIVED — ${period}</div>
      <table>
        <thead><tr><th>Customer</th><th>S/O Number</th><th style="text-align:right">Amount (K€)</th></tr></thead>
        <tbody>
          ${recentOrders.length===0
            ?'<tr><td colspan="3" style="text-align:center;color:#8FA0B3;padding:16px">No orders this week</td></tr>'
            :recentOrders.map((o:any)=>`<tr><td style="font-weight:600">${o._client}</td><td style="font-family:monospace;font-size:9px">${o.soNumber||"—"}</td><td style="text-align:right;font-weight:600;color:#2563EB">${fmtK(+o.amount||0)}</td></tr>`).join("")
          }
          <tr class="total-row"><td colspan="2">TOTAL</td><td style="text-align:right">${fmtK(recentOrdersAmt)}</td></tr>
        </tbody>
      </table>
    </div>
    <div>
      <div class="col-header">🎯 EXPECTED ORDERS</div>
      <table>
        <thead><tr><th>Customer</th><th>Project</th><th style="text-align:right">Est. (K€)</th></tr></thead>
        <tbody>
          ${expectedOrders.filter((e:any)=>e.client||e.project).length===0
            ?'<tr><td colspan="3" style="text-align:center;color:#8FA0B3;padding:16px">— to be filled —</td></tr>'
            :expectedOrders.filter((e:any)=>e.client||e.project).map((e:any)=>`<tr><td style="font-weight:600">${e.client||"—"}</td><td>${e.project||"—"}</td><td style="text-align:right;font-weight:600;color:#D97706">${e.est?fmtK(+e.est*1000):"—"}</td></tr>`).join("")
          }
        </tbody>
        ${expectedOrders.filter((e:any)=>e.est).length>0?`<tfoot>
          <tr class="total-row">
            <td colspan="2">TOTAL EXPECTED</td>
            <td style="text-align:right">${fmtK(expectedOrders.filter((e:any)=>e.est).reduce((s:number,e:any)=>s+(+e.est||0)*1000,0))}</td>
          </tr>
        </tfoot>`:""}
      </table>
    </div>
  </div>

  <div class="footer">
    <span>Order Intake — ${weekLabel} · ${period}</span>
    <span>1 / 4</span>
  </div>
</div>

<!-- ══ PAGE 3: INVOICING ══ -->
<div class="page">
  <div class="section-header">
    <div>
      <div style="font-size:10px;color:#0D9488;font-weight:600;letter-spacing:.08em;text-transform:uppercase;margin-bottom:4px">2 / 4</div>
      <div class="section-title">🧾 INVOICING — ${invoicePeriodLabel.toUpperCase()}</div>
      <div class="section-sub">— Invoices issued over the last ${invoicePeriodLabel} · Since ${invPeriodStart.toLocaleDateString("en-GB",{day:"numeric",month:"long"})}</div>
    </div>
    <div class="section-meta">
      <div class="section-badge" style="background:#CCFBF1;color:#0D9488">${weekLabel} · ${period}</div>
    </div>
  </div>

  <div class="kpi-row">
    <div class="kpi" style="border-left:4px solid #0D9488">
      <div class="kpi-label">Invoiced (${invoicePeriodLabel})</div>
      <div class="kpi-val" style="color:#0D9488">${fmtK(invoicedInPeriod)} €</div>
      <div class="kpi-sub">${invoicesInPeriod.length} invoice${invoicesInPeriod.length>1?"s":""} over the period</div>
    </div>
    <div class="kpi" style="border-left:4px solid #2563EB">
      <div class="kpi-label">Already Invoiced ${year}</div>
      <div class="kpi-val" style="color:#2563EB">${fmtK(ytdInvoiced)} €</div>
      <div class="kpi-sub">YTD since January 1st</div>
    </div>
    <div class="kpi" style="border-left:4px solid #7C3AED">
      <div class="kpi-label">Open Orders</div>
      <div class="kpi-val" style="color:#7C3AED">${fmtK(openOrders)} €</div>
      <div class="kpi-sub">Remaining to invoice</div>
    </div>
  </div>

  <div class="two-col">
    <div>
      <div class="col-header">✅ INVOICES ISSUED — ${invoicePeriodLabel.toUpperCase()}</div>
      <table>
        <thead><tr><th>Customer</th><th>Invoice #</th><th>Date</th><th style="text-align:right">Amount (K€)</th></tr></thead>
        <tbody>
          ${invoicesInPeriod.length===0
            ?'<tr><td colspan="4" style="text-align:center;color:#8FA0B3;padding:16px">No invoices for this period</td></tr>'
            :(() => {
              // Sort by date
              const sorted=[...invoicesInPeriod].sort((a:any,b:any)=>(a.date||"").localeCompare(b.date||""));
              // Group by client
              const byC:Record<string,any[]>={};
              sorted.forEach((i:any)=>{if(!byC[i._client])byC[i._client]=[];byC[i._client].push(i);});
              let r2="";
              Object.keys(byC).sort().forEach(c=>{
                const tot=byC[c].reduce((s:number,i:any)=>s+(+i.amount||0),0);
                // Customer header
                r2+=`<tr style="background:#F0FDFA"><td colspan="3" style="font-weight:700;color:#0D9488;font-size:10px">📁 ${c}</td><td style="text-align:right;font-weight:700;color:#0D9488">${fmtK(tot)}</td></tr>`;
                byC[c].forEach((i:any)=>{
                  r2+=`<tr><td style="padding-left:16px;color:#4A5568">${i.invoiceNumber||"—"}</td><td style="font-family:monospace;font-size:9px">${i._po||"—"}</td><td style="color:#8FA0B3">${fmtD(i.date)}</td><td style="text-align:right;color:#0D9488">${fmtK(+i.amount||0)}</td></tr>`;
                });
              });
              r2+=`<tr class="total-row"><td colspan="3">PERIOD TOTAL</td><td style="text-align:right">${fmtK(invoicedInPeriod)}</td></tr>`;
              return r2;
            })()
          }
        </tbody>
      </table>
    </div>
    <div>
      <div class="col-header">📅 EXPECTED INVOICING — ${MONTH_NAMES[thisMonth].toUpperCase()} / ${MONTH_NAMES[thisMonth===11?0:thisMonth+1].toUpperCase()}</div>
      <table>
        <thead><tr><th>Customer</th><th>PO #</th><th>S/O #</th><th style="text-align:right">Planned amount (K€)</th></tr></thead>
        <tbody>
          ${plannedInvoices.length===0
            ?'<tr><td colspan="4" style="text-align:center;color:#8FA0B3;padding:16px">No planned invoices — select from the weekly report</td></tr>'
            :(()=>{
              // Group by client
              const byC3:Record<string,any[]>={};
              plannedInvoices.forEach((p:any)=>{if(!byC3[p.client])byC3[p.client]=[];byC3[p.client].push(p);});
              let r5=Object.keys(byC3).sort().map(c=>{
                const cTot=byC3[c].reduce((s:number,p:any)=>s+(+p.amount||0),0);
                const rows=byC3[c].map((p:any)=>`<tr><td style="padding-left:16px;color:#4A5568">${p.client}</td><td style="font-family:monospace;font-size:9px">${p.poNumber||"—"}</td><td style="font-family:monospace;font-size:9px">${p.soNumber||"—"}</td><td style="text-align:right;color:#D97706;font-weight:600">${fmtK(+p.amount||0)}</td></tr>`).join("");
                return `<tr style="background:#FFF7ED"><td colspan="3" style="font-weight:700;color:#D97706;font-size:10px">📁 ${c}</td><td style="text-align:right;font-weight:700;color:#D97706">${fmtK(cTot)}</td></tr>${rows}`;
              }).join("");
              const grand=plannedInvoices.reduce((s:number,p:any)=>s+(+p.amount||0),0);
              r5+=`<tr class="total-row"><td colspan="3">PLANNED TOTAL</td><td style="text-align:right">${fmtK(grand)}</td></tr>`;
              return r5;
            })()
          }
        </tbody>
      </table>
    </div>
  </div>

  <div class="footer">
    <span>Invoicing — ${invoicePeriodLabel} · ${weekLabel} · ${period}</span>
    <span>2 / 4</span>
  </div>
</div>

<!-- ══ PAGE 4: LAST WEEK ══ -->
<div class="page">
  <div class="section-header">
    <div>
      <div style="font-size:10px;color:#7C3AED;font-weight:600;letter-spacing:.08em;text-transform:uppercase;margin-bottom:4px">3 / 4</div>
      <div class="section-title">📋 LAST WEEK — Field Activity</div>
      <div class="section-sub">Last week field activities</div>
    </div>
    <div class="section-meta">
      <div class="section-badge" style="background:#EDE9FE;color:#7C3AED">${weekLabel} · ${period}</div>
    </div>
  </div>
  <div>
    ${lastWeekItems.filter((item:any)=>item.client||item.action).length===0
      ?'<div style="text-align:center;padding:40px;color:#8FA0B3">No activities entered for last week</div>'
      :lastWeekItems.filter((item:any)=>item.client||item.action).map((item:any)=>`
        <div class="activity-row">
          <span class="status-icon">${item.status}</span>
          <div class="activity-content">
            ${item.client?`<div class="activity-client">${item.client}</div>`:""}
            ${item.action?`<div class="activity-desc">${item.action}</div>`:""}
          </div>
        </div>`).join("")
    }
  </div>
  <div class="footer">
    <span>Last Week Activity — ${weekLabel}</span>
    <span>3 / 4</span>
  </div>
</div>

<!-- ══ PAGE 5: THIS WEEK ══ -->
<div class="page">
  <div class="section-header">
    <div>
      <div style="font-size:10px;color:#059669;font-weight:600;letter-spacing:.08em;text-transform:uppercase;margin-bottom:4px">4 / 4</div>
      <div class="section-title">📋 THIS WEEK — Field Activity</div>
      <div class="section-sub">Planned activity</div>
    </div>
    <div class="section-meta">
      <div class="section-badge" style="background:#D1FAE5;color:#059669">${weekLabel} · ${period}</div>
    </div>
  </div>
  <div>
    ${thisWeekItems.filter((item:any)=>item.client||item.action).length===0
      ?'<div style="text-align:center;padding:40px;color:#8FA0B3">No activities entered for this week</div>'
      :thisWeekItems.filter((item:any)=>item.client||item.action).map((item:any)=>`
        <div class="activity-row">
          <span class="status-icon">${item.status}</span>
          <div class="activity-content">
            ${item.client?`<div class="activity-client">${item.client}</div>`:""}
            ${item.action?`<div class="activity-desc">${item.action}</div>`:""}
          </div>
        </div>`).join("")
    }
  </div>
  <div class="footer">
    <span>This Week Activity — ${weekLabel}</span>
    <span>4 / 4</span>
  </div>
</div>

<div style='position:fixed;top:12px;right:12px;z-index:999;display:flex;gap:8px'>
<button onclick='window.print()' style='background:#1D4ED8;color:#fff;border:none;border-radius:8px;padding:10px 20px;font-size:13px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.3)'>🖨️ Print / PDF</button>
<button onclick='window.close()' style='background:#6B7280;color:#fff;border:none;border-radius:8px;padding:10px 16px;font-size:13px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif'>✕ Close</button>
</div>
<style>@media print{.no-print{display:none!important}}</style>
</body></html>`);
    w.document.close();
  };

  // ── UI ─────────────────────────────────────────────────────────────────────
  // ActivityTable moved outside component — see below

  return(
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
        <div>
          <h1 style={{margin:"0 0 4px",fontSize:22,fontWeight:700,color:C.t1}}>Rapport Hebdomadaire</h1>
          <p style={{margin:0,color:C.t3,fontSize:13}}>Saisie des activités · données commerciales auto-générées</p>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"flex-end"}}>
          {saveMsg&&<span style={{background:C.greenL,color:C.greenDk,padding:"8px 14px",borderRadius:C.r,fontSize:12,fontWeight:600,display:"flex",alignItems:"center"}}>{saveMsg}</span>}
          <button onClick={newReport} style={{display:"flex",alignItems:"center",gap:6,background:"#fff",color:C.t2,border:`1px solid ${C.b}`,borderRadius:C.r,padding:"9px 16px",fontSize:12,fontWeight:600,cursor:"pointer"}}>
            <i className="ti ti-file-plus" style={{fontSize:15}} aria-hidden="true"/> Nouveau
          </button>
          <button onClick={()=>setShowHistory(!showHistory)} style={{display:"flex",alignItems:"center",gap:6,background:C.blueL,color:C.blueDk,border:`1px solid ${C.blue}30`,borderRadius:C.r,padding:"9px 16px",fontSize:12,fontWeight:600,cursor:"pointer",position:"relative"}}>
            <i className="ti ti-history" style={{fontSize:15}} aria-hidden="true"/> Historique
            {savedReports.length>0&&<span style={{background:C.blue,color:"#fff",borderRadius:99,fontSize:10,fontWeight:700,padding:"1px 6px",marginLeft:2}}>{savedReports.length}</span>}
          </button>
          <button onClick={saveReport} style={{display:"flex",alignItems:"center",gap:6,background:C.greenL,color:C.greenDk,border:`1px solid ${C.green}30`,borderRadius:C.r,padding:"9px 16px",fontSize:12,fontWeight:600,cursor:"pointer"}}>
            <i className="ti ti-device-floppy" style={{fontSize:15}} aria-hidden="true"/> Sauvegarder
          </button>
          <button onClick={printReport} style={{display:"flex",alignItems:"center",gap:8,background:`linear-gradient(135deg,${C.blue},${C.purple})`,color:"#fff",border:"none",borderRadius:C.r,padding:"9px 16px",fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 15px rgba(37,99,235,.35)"}}>
            <i className="ti ti-printer" style={{fontSize:16}} aria-hidden="true"/>
            Imprimer
          </button>
        </div>
      </div>

      {/* History panel */}
      {showHistory&&(
        <div style={{background:"#fff",borderRadius:C.rLg,border:`1px solid ${C.b}`,boxShadow:C.shMd,overflow:"hidden"}}>
          <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.b}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontWeight:600,fontSize:13,color:C.t1,display:"flex",alignItems:"center",gap:6}}>
              <i className="ti ti-history" style={{fontSize:14,color:C.blue}} aria-hidden="true"/>
              Rapports sauvegardés ({savedReports.length})
            </span>
            <button onClick={()=>setShowHistory(false)} style={{background:"#F1F5F9",border:"none",color:C.t3,cursor:"pointer",borderRadius:5,width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <i className="ti ti-x" style={{fontSize:13}} aria-hidden="true"/>
            </button>
          </div>
          {savedReports.length===0&&<div style={{padding:"24px",textAlign:"center",color:C.t3,fontSize:12}}>Aucun rapport sauvegardé</div>}
          <div style={{display:"flex",flexDirection:"column",gap:0}}>
            {savedReports.map((r:any,i:number)=>(
              <div key={r.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 18px",borderBottom:`1px solid ${C.b}`,background:i%2===0?"#fff":"#FAFBFD",transition:"background .12s"}}
                onMouseEnter={(e:any)=>e.currentTarget.style.background="#EFF6FF"}
                onMouseLeave={(e:any)=>e.currentTarget.style.background=i%2===0?"#fff":"#FAFBFD"}>
                <div style={{width:40,height:40,borderRadius:8,background:C.blueL,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <i className="ti ti-file-report" style={{fontSize:18,color:C.blue}} aria-hidden="true"/>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:13,color:C.t1}}>{r.label}</div>
                  <div style={{fontSize:11,color:C.t3,marginTop:2}}>
                    Sauvegardé le {new Date(r.savedAt).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"})}
                    {" · "}{(r.lastWeekItems?.filter((x:any)=>x.client||x.action).length||0)} activités semaine passée
                    {" · "}{(r.thisWeekItems?.filter((x:any)=>x.client||x.action).length||0)} activités semaine en cours
                  </div>
                </div>
                <div style={{display:"flex",gap:6,flexShrink:0}}>
                  <button onClick={()=>loadReport(r)} style={{display:"flex",alignItems:"center",gap:5,background:C.blueL,color:C.blueDk,border:"none",borderRadius:5,padding:"6px 12px",fontSize:11,fontWeight:600,cursor:"pointer"}}>
                    <i className="ti ti-folder-open" style={{fontSize:13}} aria-hidden="true"/> Charger
                  </button>
                  <button onClick={()=>{if(window.confirm(`Supprimer le rapport ${r.weekLabel} ?`))deleteReport(r.id);}}
                    style={{background:C.redL,color:C.redDk,border:"none",borderRadius:5,width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                    <i className="ti ti-trash" style={{fontSize:13}} aria-hidden="true"/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Report settings */}
      <div style={{background:"#fff",borderRadius:C.rLg,border:`1px solid ${C.b}`,boxShadow:C.sh,padding:"16px 20px"}}>
        <div style={{fontSize:12,fontWeight:600,color:C.t1,marginBottom:12,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{display:"flex",alignItems:"center",gap:6}}><i className="ti ti-settings" style={{fontSize:14,color:C.t3}} aria-hidden="true"/> Paramètres du rapport</span>
          <span style={{fontSize:10,color:C.t3,fontStyle:"italic"}}>💾 Brouillon auto-sauvegardé</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 2fr",gap:12}}>
          <div>
            <label style={{fontSize:11,color:C.t3,fontWeight:600,display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:".05em"}}>Semaine</label>
            <input value={weekLabel} onChange={e=>setWeekLabel(e.target.value)} placeholder="ex: S23"
              style={{width:"100%",padding:"8px 10px",border:`1px solid ${C.b}`,borderRadius:C.rSm,fontSize:13,fontFamily:"inherit",boxSizing:"border-box"}}/>
          </div>
          <div>
            <label style={{fontSize:11,color:C.t3,fontWeight:600,display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:".05em"}}>Période</label>
            <input value={period} onChange={e=>setPeriod(e.target.value)} placeholder="ex: Mai 2026"
              style={{width:"100%",padding:"8px 10px",border:`1px solid ${C.b}`,borderRadius:C.rSm,fontSize:13,fontFamily:"inherit",boxSizing:"border-box"}}/>
          </div>
        </div>
      </div>

      {/* Period selector for orders */}
      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <span style={{fontSize:12,fontWeight:600,color:C.t2}}>Période commandes reçues :</span>
        <div style={{display:"flex",background:"#fff",border:`1px solid ${C.b}`,borderRadius:C.r,overflow:"hidden",boxShadow:C.sh}}>
          {[{v:7,l:"7 jours"},{v:30,l:"1 mois"},{v:60,l:"2 mois"},{v:90,l:"3 mois"}].map(({v,l})=>(
            <button key={v} onClick={()=>setOrderPeriod(v)}
              style={{padding:"7px 16px",border:"none",borderRight:`1px solid ${C.b}`,
                background:orderPeriod===v?C.blue:"transparent",
                color:orderPeriod===v?"#fff":C.t2,
                fontWeight:orderPeriod===v?700:400,fontSize:12,cursor:"pointer",transition:"all .15s"}}>
              {l}
            </button>
          ))}
        </div>
        <span style={{fontSize:11,color:C.t3}}>Depuis le {periodStart.toLocaleDateString("fr-FR",{day:"numeric",month:"long"})}</span>
      </div>

      {/* Period selector for invoices */}
      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <span style={{fontSize:12,fontWeight:600,color:C.t2}}>Période factures :</span>
        <div style={{display:"flex",background:"#fff",border:`1px solid ${C.b}`,borderRadius:C.r,overflow:"hidden",boxShadow:C.sh}}>
          {[{v:7,l:"7 jours"},{v:30,l:"1 mois"},{v:60,l:"2 mois"},{v:90,l:"3 mois"}].map(({v,l})=>(
            <button key={v} onClick={()=>setInvoicePeriod(v)}
              style={{padding:"7px 16px",border:"none",borderRight:`1px solid ${C.b}`,
                background:invoicePeriod===v?C.teal:"transparent",
                color:invoicePeriod===v?"#fff":C.t2,
                fontWeight:invoicePeriod===v?700:400,fontSize:12,cursor:"pointer",transition:"all .15s"}}>
              {l}
            </button>
          ))}
        </div>
        <span style={{fontSize:11,color:C.t3}}>Depuis le {invPeriodStart.toLocaleDateString("fr-FR",{day:"numeric",month:"long"})}</span>
      </div>

      {/* Auto data preview */}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(4,1fr)",gap:12}}>
        {/* Orders KPI — expandable to show detail */}
        {(()=>{
          const[showOrders,setShowOrders]=React.useState(false);
          return(
            <div style={{background:"#fff",borderRadius:C.r,border:`2px solid ${showOrders?C.blue:C.b}`,boxShadow:C.sh,padding:"14px 16px",cursor:"pointer",transition:"border-color .15s"}}
              onClick={()=>setShowOrders(o=>!o)}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                <div style={{fontSize:10,color:C.t3,fontWeight:600,textTransform:"uppercase",letterSpacing:".05em"}}>Orders reçus ({periodLabel})</div>
                <i className={`ti ${showOrders?"ti-chevron-up":"ti-chevron-down"}`} style={{fontSize:13,color:C.blue}} aria-hidden="true"/>
              </div>
              <div style={{fontSize:18,fontWeight:800,color:C.blue}}>{fmtK(recentOrdersAmt)} €</div>
              <div style={{fontSize:11,color:C.t3,marginTop:3}}>{recentOrders.length} order{recentOrders.length>1?"s":""}</div>
              {showOrders&&recentOrders.length>0&&(
                <div style={{marginTop:10,borderTop:`1px solid ${C.b}`,paddingTop:8,display:"flex",flexDirection:"column",gap:4}} onClick={e=>e.stopPropagation()}>
                  {recentOrders.map((o:any,i:number)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:11,padding:"4px 0",borderBottom:`1px solid #F1F5F9`}}>
                      <div>
                        <span style={{fontWeight:700,color:C.t1}}>{o._client}</span>
                        <span style={{color:C.t3,marginLeft:6,fontFamily:"monospace",fontSize:10}}>{o.soNumber||o.poNumber||"—"}</span>
                      </div>
                      <span style={{fontWeight:600,color:C.blue,flexShrink:0,marginLeft:8}}>{fmtK(+o.amount||0)} €</span>
                    </div>
                  ))}
                  <div style={{display:"flex",justifyContent:"space-between",fontWeight:700,fontSize:11,paddingTop:4,color:C.blueDk}}>
                    <span>TOTAL</span><span>{fmtK(recentOrdersAmt)} €</span>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
        {[
          {label:`Invoiced (${invoicePeriodLabel})`,val:`${fmtK(invoicedInPeriod)} €`,sub:`${invoicesInPeriod.length} invoice${invoicesInPeriod.length>1?"s":""}`,c:C.teal,bg:C.tealL},
          {label:"Facturé "+MONTH_NAMES[thisMonth],val:`${fmtK(invoicedThisMonth)} €`,sub:`Ce mois · ${invoicesThisMonth.length} fact.`,c:"#0D9488",bg:"#CCFBF1"},
          {label:"Open Orders",val:`${fmtK(openOrders)} €`,sub:"Remaining to invoice",c:C.amberDk,bg:C.amberL},
        ].map((k,i)=>(
          <div key={i} style={{background:"#fff",borderRadius:C.r,border:`1px solid ${C.b}`,boxShadow:C.sh,padding:"14px 16px"}}>
            <div style={{fontSize:10,color:C.t3,fontWeight:600,textTransform:"uppercase",letterSpacing:".05em",marginBottom:6}}>{k.label}</div>
            <div style={{fontSize:18,fontWeight:800,color:k.c}}>{k.val}</div>
            <div style={{fontSize:11,color:C.t3,marginTop:3}}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Expected orders */}
      <div style={{background:"#fff",borderRadius:C.rLg,border:`1px solid ${C.b}`,boxShadow:C.sh,overflow:"hidden"}}>
        <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.b}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{fontWeight:600,fontSize:13,color:C.t1}}>🎯 Commandes attendues (Expected Orders)</span>
          <button onClick={()=>setExpectedOrders(p=>[...p,{client:"",project:"",est:""}])}
            style={{display:"flex",alignItems:"center",gap:5,background:C.amberL,color:C.amberDk,border:"none",borderRadius:5,padding:"5px 10px",fontSize:11,fontWeight:600,cursor:"pointer"}}>
            <i className="ti ti-plus" style={{fontSize:13}} aria-hidden="true"/> Ajouter
          </button>
        </div>
        <div style={{padding:"12px 18px",display:"flex",flexDirection:"column",gap:8}}>
          {expectedOrders.map((item:any,idx:number)=>(
            <div key={idx} style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 2fr 120px 32px",gap:8,alignItems:"center"}}>
              <input value={item.client} onChange={e=>setExpectedOrders((p:any)=>p.map((x:any,i:number)=>i===idx?{...x,client:e.target.value}:x))}
                placeholder="Customer" style={{padding:"6px 8px",borderRadius:5,border:`1px solid ${C.b}`,fontSize:12,fontFamily:"inherit"}}/>
              <input value={item.project} onChange={e=>setExpectedOrders((p:any)=>p.map((x:any,i:number)=>i===idx?{...x,project:e.target.value}:x))}
                placeholder="Projet / Description" style={{padding:"6px 8px",borderRadius:5,border:`1px solid ${C.b}`,fontSize:12,fontFamily:"inherit"}}/>
              <input type="number" value={item.est} onChange={e=>setExpectedOrders((p:any)=>p.map((x:any,i:number)=>i===idx?{...x,est:e.target.value}:x))}
                placeholder="K€" style={{padding:"6px 8px",borderRadius:5,border:`1px solid ${C.b}`,fontSize:12,fontFamily:"inherit"}}/>
              <button onClick={()=>setExpectedOrders((p:any)=>p.filter((_:any,i:number)=>i!==idx))}
                style={{background:C.redL,color:C.redDk,border:"none",borderRadius:5,width:32,height:32,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <i className="ti ti-trash" style={{fontSize:13}} aria-hidden="true"/>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Planned invoices — select from open orders */}
      {(()=>{
        const openOrdersList=allOrders.filter((o:any)=>{
          const inv=(o.invoices||[]).reduce((s:number,i:any)=>s+(+i.amount||0),0);
          return inv<(+o.amount||0)*0.999&&o.status!=="annule";
        });
        const totalPlanned=plannedInvoices.reduce((s:number,p:any)=>s+(+p.amount||0),0);
        const toggleOrder=(o:any)=>{
          const key=o._client+"|"+o.id;
          const exists=plannedInvoices.find((p:any)=>p.key===key);
          if(exists){
            setPlannedInvoices(prev=>prev.filter((p:any)=>p.key!==key));
          } else {
            const inv=(o.invoices||[]).reduce((s:number,i:any)=>s+(+i.amount||0),0);
            const rem=Math.max(0,(+o.amount||0)-inv);
            setPlannedInvoices(prev=>[...prev,{key,client:o._client,poNumber:o.poNumber,soNumber:o.soNumber,amount:rem,fullAmount:rem}]);
          }
        };
        return(
          <div style={{background:"#fff",borderRadius:C.rLg,border:`1px solid ${C.b}`,boxShadow:C.sh,overflow:"hidden"}}>
            <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.b}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <span style={{fontWeight:600,fontSize:13,color:C.t1}}>🧾 Factures prévues (Expected Invoicing)</span>
                <span style={{fontSize:11,color:C.t3,marginLeft:10}}>Sélectionne les open orders à facturer ce mois / mois prochain</span>
              </div>
              {totalPlanned>0&&<span style={{background:C.tealL,color:C.teal,fontWeight:700,fontSize:13,padding:"4px 12px",borderRadius:6}}>{fmtK(totalPlanned)} €</span>}
            </div>
            {openOrdersList.length===0
              ?<div style={{padding:"16px 18px",fontSize:12,color:C.t3}}>No open orders disponible</div>
              :<div style={{maxHeight:320,overflowY:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead>
                    <tr style={{background:"#F8FAFC",borderBottom:`1px solid ${C.b}`}}>
                      <th style={{padding:"8px 14px",textAlign:"left",color:C.t3,fontWeight:500,fontSize:11,width:40}}/>
                      <th style={{padding:"8px 14px",textAlign:"left",color:C.t3,fontWeight:500,fontSize:11}}>Customer</th>
                      <th style={{padding:"8px 14px",textAlign:"left",color:C.t3,fontWeight:500,fontSize:11}}>PO #</th>
                      <th style={{padding:"8px 14px",textAlign:"left",color:C.t3,fontWeight:500,fontSize:11}}>S/O #</th>
                      <th style={{padding:"8px 14px",textAlign:"right",color:C.t3,fontWeight:500,fontSize:11}}>Reste à fact.</th>
                      <th style={{padding:"8px 14px",textAlign:"right",color:C.teal,fontWeight:600,fontSize:11}}>Montant prévu (€)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openOrdersList.map((o:any,idx:number)=>{
                      const key=o._client+"|"+o.id;
                      const planned=plannedInvoices.find((p:any)=>p.key===key);
                      const inv=(o.invoices||[]).reduce((s:number,i:any)=>s+(+i.amount||0),0);
                      const rem=Math.max(0,(+o.amount||0)-inv);
                      const isSelected=!!planned;
                      return(
                        <tr key={idx} style={{borderBottom:`1px solid ${C.b}`,background:isSelected?C.tealL+"60":"transparent",cursor:"pointer"}}
                          onClick={()=>toggleOrder(o)}>
                          <td style={{padding:"8px 14px",textAlign:"center"}}>
                            <div style={{width:18,height:18,borderRadius:4,border:`2px solid ${isSelected?C.teal:C.b}`,background:isSelected?C.teal:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                              {isSelected&&<i className="ti ti-check" style={{fontSize:11,color:"#fff"}} aria-hidden="true"/>}
                            </div>
                          </td>
                          <td style={{padding:"8px 14px",fontWeight:600,color:C.t1}}>{o._client}</td>
                          <td style={{padding:"8px 14px",color:C.t2,fontFamily:"monospace",fontSize:11}}>{o.poNumber||"—"}</td>
                          <td style={{padding:"8px 14px",color:C.t2,fontFamily:"monospace",fontSize:11}}>{o.soNumber||"—"}</td>
                          <td style={{padding:"8px 14px",textAlign:"right",color:C.amberDk,fontWeight:600}}>{fmt(rem)} €</td>
                          <td style={{padding:"6px 14px",textAlign:"right"}} onClick={e=>e.stopPropagation()}>
                            {isSelected
                              ?<input type="number" value={planned.amount}
                                  onChange={e=>setPlannedInvoices(prev=>prev.map((p:any)=>p.key===key?{...p,amount:+e.target.value||0}:p))}
                                  onClick={e=>e.stopPropagation()}
                                  style={{width:110,padding:"4px 8px",border:`2px solid ${C.teal}`,borderRadius:5,fontSize:12,fontWeight:600,color:C.teal,textAlign:"right",fontFamily:"inherit"}}
                                />
                              :<span style={{color:C.t3,fontSize:11}}>—</span>
                            }
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {plannedInvoices.length>0&&(
                    <tfoot>
                      <tr style={{background:C.tealL,borderTop:`2px solid ${C.teal}`}}>
                        <td colSpan={5} style={{padding:"8px 14px",fontWeight:700,color:C.teal,textAlign:"right"}}>TOTAL FACTURES PRÉVUES</td>
                        <td style={{padding:"8px 14px",fontWeight:800,color:C.teal,textAlign:"right"}}>{fmt(totalPlanned)} €</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            }
          </div>
        );
      })()}

      {/* Activity tables */}
      <ActivityTable
        items={lastWeekItems}
        onAdd={()=>setLastWeekItems(p=>[...p,{priority:"MEDIUM",client:"",action:"",status:"📋"}])}
        onUpdate={(idx:number,field:string,val:string)=>setLastWeekItems(p=>p.map((item:any,i:number)=>i===idx?{...item,[field]:val}:item))}
        onRemove={(idx:number)=>setLastWeekItems(p=>p.filter((_:any,i:number)=>i!==idx))}
        title="📋 Semaine passée — Activités terrain" color={C.purple} isMobile={isMobile}/>
      <ActivityTable
        items={thisWeekItems}
        onAdd={()=>setThisWeekItems(p=>[...p,{priority:"MEDIUM",client:"",action:"",status:"📋"}])}
        onUpdate={(idx:number,field:string,val:string)=>setThisWeekItems(p=>p.map((item:any,i:number)=>i===idx?{...item,[field]:val}:item))}
        onRemove={(idx:number)=>setThisWeekItems(p=>p.filter((_:any,i:number)=>i!==idx))}
        title="📋 Semaine en cours — Planned Activity" color={C.green} isMobile={isMobile}/>

      {/* Print button bottom */}
      <div style={{display:"flex",justifyContent:"center",gap:12,paddingBottom:20,flexWrap:"wrap"}}>
        <button onClick={printReport}
          style={{display:"flex",alignItems:"center",gap:10,background:`linear-gradient(135deg,${C.blue},${C.purple})`,color:"#fff",border:"none",borderRadius:C.rLg,padding:"14px 32px",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:"0 6px 20px rgba(37,99,235,.4)"}}>
          <i className="ti ti-printer" style={{fontSize:18}} aria-hidden="true"/>
          Générer & Imprimer le rapport PDF (5 pages)
        </button>
        <button onClick={printMonthlyReport}
          style={{display:"flex",alignItems:"center",gap:10,background:`linear-gradient(135deg,#0D9488,#0369A1)`,color:"#fff",border:"none",borderRadius:C.rLg,padding:"14px 32px",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:"0 6px 20px rgba(13,148,136,.4)"}}>
          <i className="ti ti-calendar-month" style={{fontSize:18}} aria-hidden="true"/>
          Mois en cours — Rapport détaillé
        </button>
      </div>
    </div>
  );
}

// ─── CATALOGUE & DEVIS ───────────────────────────────────────────────────────
// ─── EXPORT EXCEL (SheetJS CDN) ──────────────────────────────────────────────
const exportToExcel=async(data:any[][],filename:string,sheetName="Export")=>{
  if(!(window as any).XLSX){
    await new Promise<void>((res,rej)=>{
      const s=document.createElement("script");
      s.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      s.onload=()=>res();s.onerror=()=>rej();
      document.head.appendChild(s);
    });
  }
  const XLSX=(window as any).XLSX;
  const ws=XLSX.utils.aoa_to_sheet(data);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,sheetName);
  XLSX.writeFile(wb,filename);
};

const DRAFT_LOGO_B64="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";
const CAT_KEY="ordertrack-catalogue";
const QUOT_KEY="ordertrack-quotes";
const CAT_K="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4eHJ4bnl4Zm1nY2R6eGNpZ2R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMTg5MzIsImV4cCI6MjA5NTc5NDkzMn0.wF2mt8BK1KGk-VyK4zZQvFGJCxCp8UGDPdgT_8DHc6o";
const CAT_B="https://vxxrxnyxfmgcdzxcigdw.supabase.co";

const sbGet=async(key:string)=>{
  try{
    const r=await fetch(CAT_B+"/rest/v1/ordertrack_data?apikey="+CAT_K+"&user_key=eq."+key+"&select=payload,updated_at&limit=1",
      {headers:{"apikey":CAT_K,"Authorization":"Bearer "+CAT_K,"Prefer":"return=representation"}});
    if(!r.ok)return null;
    const d=await r.json();
    if(!d?.[0])return null;
    return{...d[0].payload,_updatedAt:d[0].updated_at};
  }catch(e){console.warn("[sbGet]",key,e);return null;}
};
const sbSet=async(key:string,payload:any):Promise<boolean>=>{
  try{
    // Step 1: try PATCH (update existing row)
    const patch=await fetch(CAT_B+"/rest/v1/ordertrack_data?apikey="+CAT_K+"&user_key=eq."+key,{
      method:"PATCH",
      headers:{"Content-Type":"application/json","apikey":CAT_K,"Authorization":"Bearer "+CAT_K,"Prefer":"return=minimal"},
      body:JSON.stringify({payload,updated_at:new Date().toISOString()})
    });
    if(patch.status===204||patch.status===200){
      console.log("[sbSet] PATCH OK:",key);
      return true;
    }
    // Step 2: if no row, INSERT
    const post=await fetch(CAT_B+"/rest/v1/ordertrack_data?apikey="+CAT_K,{
      method:"POST",
      headers:{"Content-Type":"application/json","apikey":CAT_K,"Authorization":"Bearer "+CAT_K,"Prefer":"resolution=merge-duplicates,return=minimal"},
      body:JSON.stringify({user_key:key,payload})
    });
    const ok=post.status===201||post.status===200||post.status===204;
    console.log("[sbSet] POST:",key,"status:",post.status,ok?"OK":"FAIL");
    if(!ok){const e=await post.text();console.warn("[sbSet] Error:",e);}
    return ok;
  }catch(e){console.warn("[sbSet] Exception:",key,e);return false;}
};

// Also cache catalogue in localStorage to survive page refresh
const CAT_LS_KEY="ordertrack_catalogue_cache";
const QUOT_LS_KEY="ordertrack_quotes_cache";
const CAT_TS_KEY=CAT_LS_KEY+"_ts";
const QUOT_TS_KEY=QUOT_LS_KEY+"_ts";

const saveCatLocal=(p:any[])=>{
  try{
    localStorage.setItem(CAT_LS_KEY,JSON.stringify(p));
    localStorage.setItem(CAT_TS_KEY,new Date().toISOString());
  }catch{}
};
const loadCatLocal=():{data:any[]|null,ts:string}=>{
  try{
    const d=localStorage.getItem(CAT_LS_KEY);
    const ts=localStorage.getItem(CAT_TS_KEY)||"";
    return{data:d?JSON.parse(d):null,ts};
  }catch{return{data:null,ts:""};}
};
const saveQuotLocal=(q:any[])=>{
  try{
    localStorage.setItem(QUOT_LS_KEY,JSON.stringify(q));
    localStorage.setItem(QUOT_TS_KEY,new Date().toISOString());
  }catch{}
};
const loadQuotLocal=():{data:any[]|null,ts:string}=>{
  try{
    const d=localStorage.getItem(QUOT_LS_KEY);
    const ts=localStorage.getItem(QUOT_TS_KEY)||"";
    return{data:d?JSON.parse(d):null,ts};
  }catch{return{data:null,ts:""};}
};

const AVAIL_OPTIONS=["Stock","2-4 weeks EXW","4-6 weeks EXW","6-8 weeks EXW","8-10 weeks EXW","10-12 weeks EXW","12-14 weeks EXW","14-18 weeks EXW","18-24 weeks EXW","24-28 weeks EXW"];

// Convert French month label to ISO date string
const frMonthToISO=(label:string):string=>{
  const MONTHS_FR:Record<string,string>={
    "janvier":"01","fevrier":"02","février":"02","mars":"03","avril":"04",
    "mai":"05","juin":"06","juillet":"07","aout":"08","août":"08",
    "septembre":"09","octobre":"10","novembre":"11","decembre":"12","décembre":"12"
  };
  const l=label.toLowerCase().trim();
  for(const [m,n] of Object.entries(MONTHS_FR)){
    if(l.includes(m)){
      const yearMatch=l.match(/20\d{2}/);
      const year=yearMatch?yearMatch[0]:new Date().getFullYear().toString();
      return `${year}-${n}-01`;
    }
  }
  return new Date().toISOString().slice(0,10);
};

// Check if a row contains a date/period label (like "FEVRIER 2026")
const isPeriodLabel=(row:any[]):string|null=>{
  for(const cell of row){
    const s=String(cell||"").trim();
    if(/^(JANVIER|FEVRIER|FÉVRIER|MARS|AVRIL|MAI|JUIN|JUILLET|AOUT|AOÛT|SEPTEMBRE|OCTOBRE|NOVEMBRE|DECEMBRE|DÉCEMBRE)\s+20\d{2}$/i.test(s)){
      return s;
    }
  }
  return null;
};

// Parse Excel with SheetJS (loaded dynamically)
const parseExcel=async(file:File):Promise<any[]>=>{
  return new Promise((resolve)=>{
    const reader=new FileReader();
    reader.onload=async(e)=>{
      try{
        // Dynamically load SheetJS
        if(!(window as any).XLSX){
          await new Promise<void>((res,rej)=>{
            const s=document.createElement("script");
            s.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
            s.onload=()=>res();s.onerror=()=>rej();
            document.head.appendChild(s);
          });
        }
        const XLSX=(window as any).XLSX;
        const data=new Uint8Array(e.target?.result as ArrayBuffer);
        const wb=XLSX.read(data,{type:"array"});
        const ws=wb.Sheets[wb.SheetNames[0]];
        const rows:any[]=XLSX.utils.sheet_to_json(ws,{header:1,defval:""});
        resolve(rows);
      }catch(err){console.warn("Excel parse error",err);resolve([]);}
    };
    reader.readAsArrayBuffer(file);
  });
};

// Detect columns from header row — supports GRUNDFOS format and others
const detectColumns=(headers:string[])=>{
  const h=headers.map((x:any)=>String(x||"").toLowerCase().trim());
  const find=(...keys:string[])=>{
    for(const k of keys){const i=h.findIndex((x:string)=>x.includes(k));if(i>=0)return i;}
    return -1;
  };
  return{
    pn:find("pn","part number","p/n","référence","reference","sku","code article"),
    desc:find("product","description","libellé","designation","désignation","produit","name","nom","article","label","wording","intitulé","désign"),
    price:find("up (€)","up (eur)","up","unit price","prix unitaire","price","prix","tarif","cost"),
    qty:find("qty","quantité","quantite","stock","qté","disponible","quantity"),
    customer:find("customer","client","compte"),
    avail:find("avail","dispo","lead","délai","delai"),
  };
};

// Smart header finder — scans all rows to find the header row
const findHeaderRow=(rows:any[][]):{headerIdx:number,colMap:any}=>{
  // Score each row — the header row has the most column name keywords
  let bestScore=-1,bestIdx=0;
  for(let i=0;i<Math.min(20,rows.length);i++){
    const row=rows[i];
    if(!row.some((x:any)=>x!==null&&x!==undefined&&x!==""))continue;
    const headers=row.map((x:any)=>String(x||"").toLowerCase().trim());
    let score=0;
    // Strong indicators
    if(headers.some((h:string)=>h==="pn"||h==="part number"||h==="p/n"||h==="référence"))score+=3;
    if(headers.some((h:string)=>h.includes("up")||h.includes("p.u")||h.includes("pu.")||h==="price"||h==="prix"||h==="tarif"||h==="cost"))score+=3;
    if(headers.some((h:string)=>h.includes("description")||h==="product"||h.includes("désign")))score+=2;
    if(headers.some((h:string)=>h.includes("qty")||h.includes("quantit")||h.includes("stock")))score+=1;
    if(headers.some((h:string)=>h.includes("customer")||h.includes("client")))score+=1;
    // Penalty if row has numeric-only cells (likely data row)
    const numericCount=row.filter((x:any)=>typeof x==="number"||(typeof x==="string"&&/^\d+[\.,]?\d*$/.test(x.trim()))).length;
    if(numericCount>row.length/2)score-=3;
    if(score>bestScore){bestScore=score;bestIdx=i;}
  }
  if(bestScore>=2){
    return{headerIdx:bestIdx,colMap:detectColumns(rows[bestIdx].map((x:any)=>String(x||"")))};
  }
  // Fallback: first non-empty row
  for(let i=0;i<Math.min(5,rows.length);i++){
    if(rows[i].some((x:any)=>x!==null&&x!==undefined&&x!==""))return{headerIdx:i,colMap:detectColumns(rows[i].map((x:any)=>String(x||"")))};
  }
  return{headerIdx:0,colMap:{pn:-1,desc:-1,price:-1,qty:-1,customer:-1,avail:-1}};
};

// Extract customer name from pre-header rows (GRUNDFOS format)
const extractCustomer=(rows:any[][],headerIdx:number):string=>{
  for(let i=0;i<headerIdx;i++){
    for(const cell of rows[i]){
      const s=String(cell||"").trim();
      if(s.length>3&&!s.includes("=")){
        // Look for customer name pattern e.g. "BERNABE (7292002420)"
        const m=s.match(/^([A-Z][A-Z\s]+)/);
        if(m&&m[1].trim().length>2) return m[1].trim();
      }
    }
  }
  return "";
};

// ─── MANUAL PRODUCT ENTRY ────────────────────────────────────────────────────
function ManualProductEntry({products,saveProducts}:any){
  const[pn,setPn]=useState("");
  const[desc,setDesc]=useState("");
  const[price,setPrice]=useState("");
  const[date,setDate]=useState(new Date().toISOString().slice(0,10));
  const[customer,setCustomer]=useState("");
  const[msg,setMsg]=useState("");
  const[editExisting,setEditExisting]=useState<any>(null);
  const pnRef=useRef<HTMLInputElement>(null);

  const handleAdd=async()=>{
    if(!pn.trim()){setMsg("Le PN est obligatoire");return;}
    const priceVal=parseFloat(price.replace(",","."))||0;
    if(!priceVal){setMsg("Saisir un prix valide");return;}
    const today=date||new Date().toISOString().slice(0,10);
    const existing=products.findIndex((p:any)=>p.pn.toLowerCase()===pn.trim().toLowerCase());
    const priceEntry={price:priceVal,currency:"EUR",customer:customer.trim(),date:today,source:"Saisie manuelle"};
    let updated=[...products];
    if(existing>=0){
      // Update existing product
      const prod={...updated[existing]};
      if(desc.trim()&&desc.trim()!==pn.trim())prod.description=desc.trim();
      prod.prices=[priceEntry,...(prod.prices||[])];
      prod.lastUpdated=today;
      updated[existing]=prod;
      setMsg(`✓ Prix ajouté au produit existant : ${pn.trim()}`);
    } else {
      // New product
      updated=[{
        id:Date.now().toString()+Math.random().toString(36).slice(2,5),
        pn:pn.trim(),
        description:desc.trim()&&desc.trim()!==pn.trim()?desc.trim():"",
        prices:[priceEntry],
        lastUpdated:today
      },...updated];
      setMsg(`✓ Nouveau produit ajouté : ${pn.trim()}`);
    }
    await saveProducts(updated);
    setPn("");setDesc("");setPrice("");setCustomer("");
    setTimeout(()=>setMsg(""),3000);
    pnRef.current?.focus();
  };

  // Check if PN already exists for live feedback
  const existing=pn.trim()?products.find((p:any)=>p.pn.toLowerCase()===pn.trim().toLowerCase()):null;

  return(
    <div style={{background:"#fff",borderRadius:C.rLg,border:`2px solid ${C.blue}20`,boxShadow:C.sh,overflow:"hidden"}}>
      <div style={{padding:"14px 20px",borderBottom:`1px solid ${C.b}`,background:`linear-gradient(135deg,${C.blueL},#fff)`,display:"flex",alignItems:"center",gap:8}}>
        <i className="ti ti-keyboard" style={{fontSize:16,color:C.blue}} aria-hidden="true"/>
        <span style={{fontWeight:700,fontSize:13,color:C.t1}}>Saisie manuelle — Ajouter un produit au catalogue</span>
      </div>
      <div style={{padding:"16px 20px"}}>
        {msg&&(
          <div style={{background:msg.startsWith("✓")?C.greenL:C.redL,color:msg.startsWith("✓")?C.greenDk:C.redDk,
            padding:"8px 14px",borderRadius:6,marginBottom:12,fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:6}}>
            <i className={`ti ${msg.startsWith("✓")?"ti-check":"ti-alert-circle"}`} style={{fontSize:14}} aria-hidden="true"/>
            {msg}
          </div>
        )}
        <div style={{display:"grid",gridTemplateColumns:"1fr 2fr 1fr 1fr 1fr",gap:10,alignItems:"end"}}>
          {/* PN */}
          <div>
            <label style={{fontSize:10,color:C.t3,fontWeight:700,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:".06em"}}>
              Part Number *
            </label>
            <div style={{position:"relative"}}>
              <input ref={pnRef} value={pn} onChange={e=>setPn(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&handleAdd()}
                placeholder="ex: 96516993"
                style={{width:"100%",padding:"8px 10px",
                  border:`2px solid ${existing?C.amber:pn?C.blue:C.b}`,
                  borderRadius:C.rSm,fontSize:12,fontFamily:"inherit",boxSizing:"border-box",
                  background:existing?C.amberL:"#fff"}}/>
              {existing&&(
                <div style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",fontSize:10,color:C.amberDk,fontWeight:600,whiteSpace:"nowrap"}}>
                  Existe déjà
                </div>
              )}
            </div>
            {existing&&<div style={{fontSize:10,color:C.amberDk,marginTop:2}}>Un prix sera ajouté à ce produit</div>}
          </div>
          {/* Description */}
          <div>
            <label style={{fontSize:10,color:C.t3,fontWeight:700,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:".06em"}}>Description</label>
            <input value={desc||existing?.description||""} onChange={e=>setDesc(e.target.value)}
              placeholder={existing?.description||"ex: CR5-10 A-A-A-E-HQQE 3x230/400 50HZ"}
              style={{width:"100%",padding:"8px 10px",border:`1px solid ${C.b}`,borderRadius:C.rSm,fontSize:12,fontFamily:"inherit",boxSizing:"border-box",
                background:existing?.description&&!desc?"#F8FAFC":"#fff",color:existing?.description&&!desc?C.t3:C.t1}}/>
          </div>
          {/* Price */}
          <div>
            <label style={{fontSize:10,color:C.t3,fontWeight:700,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:".06em"}}>Prix UP (€) *</label>
            <input value={price} onChange={e=>setPrice(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&handleAdd()}
              placeholder="ex: 791.78"
              type="number" step="0.01" min="0"
              style={{width:"100%",padding:"8px 10px",border:`1px solid ${C.b}`,borderRadius:C.rSm,fontSize:12,fontFamily:"inherit",boxSizing:"border-box"}}/>
          </div>
          {/* Date */}
          <div>
            <label style={{fontSize:10,color:C.t3,fontWeight:700,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:".06em"}}>Date</label>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)}
              style={{width:"100%",padding:"8px 10px",border:`1px solid ${C.b}`,borderRadius:C.rSm,fontSize:12,fontFamily:"inherit",boxSizing:"border-box"}}/>
          </div>
          {/* Add button */}
          <div>
            <button onClick={handleAdd}
              style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:6,
                background:pn&&price?C.blue:"#D1D5DB",color:"#fff",border:"none",
                borderRadius:C.rSm,padding:"8px 12px",fontSize:12,fontWeight:700,
                cursor:pn&&price?"pointer":"not-allowed",transition:"all .15s"}}>
              <i className="ti ti-plus" style={{fontSize:14}} aria-hidden="true"/>
              {existing?"Ajouter prix":"Ajouter"}
            </button>
          </div>
        </div>
        {/* Recent manual entries */}
        {products.filter((p:any)=>p.prices?.some((pr:any)=>pr.source==="Saisie manuelle")).length>0&&(
          <div style={{marginTop:14,borderTop:`1px solid ${C.b}`,paddingTop:12}}>
            <div style={{fontSize:11,color:C.t3,fontWeight:600,marginBottom:8}}>Dernières saisies manuelles</div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              {products
                .filter((p:any)=>p.prices?.some((pr:any)=>pr.source==="Saisie manuelle"))
                .slice(0,5)
                .map((p:any)=>{
                  const manualPrices=p.prices.filter((pr:any)=>pr.source==="Saisie manuelle");
                  const latest=manualPrices[0];
                  return(
                    <div key={p.pn} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 10px",background:"#F8FAFC",borderRadius:5,border:`1px solid ${C.b}`}}>
                      <span style={{fontWeight:700,color:C.blue,fontFamily:"monospace",fontSize:11,minWidth:80}}>{p.pn}</span>
                      <span style={{flex:1,color:C.t2,fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.description||"—"}</span>
                      <span style={{fontWeight:700,color:C.greenDk,fontSize:11,whiteSpace:"nowrap"}}>{fmt(latest?.price)} €</span>
                      <span style={{color:C.t3,fontSize:10}}>{latest?.date}</span>
                    </div>
                  );
                })
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CATALOGUE EDIT MODAL ────────────────────────────────────────────────────
function CatEditModal({product,onSave,onClose}:any){
  const[pn,setPn]=useState(product?.pn||"");
  const[desc,setDesc]=useState(product?.description||"");
  const[prices,setPrices]=useState<any[]>(product?.prices||[]);
  const[newPrice,setNewPrice]=useState("");
  const[newDate,setNewDate]=useState(new Date().toISOString().slice(0,10));
  const[newCustomer,setNewCustomer]=useState("");

  const addPrice=()=>{
    const v=parseFloat(newPrice.replace(",","."))||0;
    if(!v)return;
    setPrices(p=>[{price:v,currency:"EUR",customer:newCustomer,date:newDate,source:"Saisie manuelle"},...p]);
    setNewPrice("");setNewCustomer("");
  };

  const removePrice=(idx:number)=>setPrices(p=>p.filter((_:any,i:number)=>i!==idx));

  const handleSave=()=>{
    if(!pn.trim())return;
    onSave({...product,pn:pn.trim(),description:desc.trim(),prices,lastUpdated:new Date().toISOString().slice(0,10)});
  };

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,backdropFilter:"blur(3px)"}}>
      <div style={{background:"#fff",borderRadius:16,width:560,maxWidth:"96vw",maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,.3)"}}>
        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 22px",borderBottom:`1px solid ${C.b}`}}>
          <h3 style={{margin:0,fontSize:15,fontWeight:700,color:C.t1,display:"flex",alignItems:"center",gap:8}}>
            <i className="ti ti-edit" style={{fontSize:16,color:C.blue}} aria-hidden="true"/>
            Modifier le produit
          </h3>
          <button onClick={onClose} style={{background:"#F1F5F9",border:"none",color:C.t3,cursor:"pointer",borderRadius:6,width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <i className="ti ti-x" style={{fontSize:14}} aria-hidden="true"/>
          </button>
        </div>
        {/* Body */}
        <div style={{overflowY:"auto",flex:1,padding:"18px 22px",display:"flex",flexDirection:"column",gap:14}}>
          {/* PN + Description */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:10}}>
            <div>
              <label style={{fontSize:10,color:C.t3,fontWeight:700,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:".05em"}}>Part Number</label>
              <input value={pn} onChange={e=>setPn(e.target.value)}
                style={{width:"100%",padding:"8px 10px",border:`1px solid ${C.b}`,borderRadius:6,fontSize:13,fontFamily:"monospace",fontWeight:700,color:C.blue,boxSizing:"border-box"}}/>
            </div>
            <div>
              <label style={{fontSize:10,color:C.t3,fontWeight:700,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:".05em"}}>Description</label>
              <input value={desc} onChange={e=>setDesc(e.target.value)}
                style={{width:"100%",padding:"8px 10px",border:`1px solid ${C.b}`,borderRadius:6,fontSize:12,fontFamily:"inherit",boxSizing:"border-box"}}/>
            </div>
          </div>
          {/* Prices list */}
          <div>
            <label style={{fontSize:10,color:C.t3,fontWeight:700,display:"block",marginBottom:8,textTransform:"uppercase",letterSpacing:".05em"}}>
              Prix ({prices.length})
            </label>
            <div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:10}}>
              {prices.map((pr:any,i:number)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",background:"#F8FAFC",borderRadius:6,border:`1px solid ${C.b}`}}>
                  <span style={{fontWeight:700,color:C.blue,fontSize:13,minWidth:80}}>{fmt(pr.price)} €</span>
                  <span style={{fontSize:11,color:C.t3,flex:1}}>{pr.date} {pr.customer&&`· ${pr.customer}`} · {pr.source}</span>
                  <button onClick={()=>removePrice(i)}
                    style={{background:C.redL,color:C.redDk,border:"none",borderRadius:4,width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}>
                    <i className="ti ti-trash" style={{fontSize:11}} aria-hidden="true"/>
                  </button>
                </div>
              ))}
              {prices.length===0&&<div style={{color:C.t3,fontSize:12,padding:"8px 0"}}>Aucun prix enregistré</div>}
            </div>
            {/* Add new price */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 130px 120px 32px",gap:6,alignItems:"end"}}>
              <div>
                <label style={{fontSize:10,color:C.t3,fontWeight:600,display:"block",marginBottom:3}}>Nouveau prix (€)</label>
                <input value={newPrice} onChange={e=>setNewPrice(e.target.value)} type="number" step="0.01" placeholder="ex: 1250.00"
                  style={{width:"100%",padding:"7px 8px",border:`1px solid ${C.b}`,borderRadius:5,fontSize:12,fontFamily:"inherit",boxSizing:"border-box"}}/>
              </div>
              <div>
                <label style={{fontSize:10,color:C.t3,fontWeight:600,display:"block",marginBottom:3}}>Date</label>
                <input type="date" value={newDate} onChange={e=>setNewDate(e.target.value)}
                  style={{width:"100%",padding:"7px 8px",border:`1px solid ${C.b}`,borderRadius:5,fontSize:12,fontFamily:"inherit",boxSizing:"border-box"}}/>
              </div>
              <div>
                <label style={{fontSize:10,color:C.t3,fontWeight:600,display:"block",marginBottom:3}}>Customer</label>
                <input value={newCustomer} onChange={e=>setNewCustomer(e.target.value)} placeholder="optionnel"
                  style={{width:"100%",padding:"7px 8px",border:`1px solid ${C.b}`,borderRadius:5,fontSize:12,fontFamily:"inherit",boxSizing:"border-box"}}/>
              </div>
              <button onClick={addPrice} style={{background:C.greenL,color:C.greenDk,border:"none",borderRadius:5,height:32,width:32,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                <i className="ti ti-plus" style={{fontSize:14}} aria-hidden="true"/>
              </button>
            </div>
          </div>
        </div>
        {/* Footer */}
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",padding:"14px 22px",borderTop:`1px solid ${C.b}`}}>
          <button onClick={onClose} style={{background:"#F1F5F9",color:C.t2,border:"none",borderRadius:8,padding:"9px 18px",fontSize:12,fontWeight:600,cursor:"pointer"}}>
            Annuler
          </button>
          <button onClick={handleSave} style={{background:C.blue,color:"#fff",border:"none",borderRadius:8,padding:"9px 18px",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
            <i className="ti ti-check" style={{fontSize:14}} aria-hidden="true"/> Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CATALOGUE PAGE ───────────────────────────────────────────────────────────
function CataloguePage({clients,lang,isMobile}:any){
  const[tab,setTab]=useState<"upload"|"catalogue"|"devis">("devis");
  const[products,setProducts]=useState<any[]>([]);
  const[quotes,setQuotes]=useState<any[]>([]);
  const[loading,setLoading]=useState(true);
  const[syncStatus,setSyncStatus]=useState<"idle"|"syncing"|"ok"|"error">("idle");
  const[syncMsg,setSyncMsg]=useState("");
  const[uploading,setUploading]=useState(false);
  const[uploadMsg,setUploadMsg]=useState("");
  const[multiFiles,setMultiFiles]=useState<File[]>([]);
  const[processingIdx,setProcessingIdx]=useState(-1);
  const[previewRows,setPreviewRows]=useState<any[]>([]);
  const[allRows,setAllRows]=useState<any[]>([]);
  const[colMap,setColMap]=useState<any>({pn:-1,desc:-1,price:-1,qty:-1,customer:-1,avail:-1});
  const[pendingFile,setPendingFile]=useState<string>("");
  const[catSearch,setCatSearch]=useState("");
  const[catEditProduct,setCatEditProduct]=useState<any>(null);
  const fileRef=useRef<HTMLInputElement>(null);

  // Quote form state
  const[qCustomer,setQCustomer]=useState("");
  const[qLines,setQLines]=useState<any[]>([{pn:"",desc:"",qty:1,unitPrice:0,avail:"",priceOptions:[],selectedPriceIdx:-1}]);
  const[dropdownPos,setDropdownPos]=useState<{top:number,left:number,width:number}|null>(null);
  const[dropdownType,setDropdownType]=useState<"pn"|"desc"|null>(null);
  const[dropdownLineIdx,setDropdownLineIdx]=useState<number>(-1);
  const[dropdownItems,setDropdownItems]=useState<any[]>([]);
  const closeDropdown=()=>{setDropdownPos(null);setDropdownType(null);setDropdownLineIdx(-1);setDropdownItems([]);};

  const openDropdown=(e:any,type:"pn"|"desc",idx:number,items:any[])=>{
    if(!items.length){closeDropdown();return;}
    const rect=e.target.getBoundingCustomerRect();
    setDropdownPos({top:rect.bottom+4,left:rect.left,width:Math.max(rect.width,280)});
    setDropdownType(type);setDropdownLineIdx(idx);setDropdownItems(items);
  };
  const[qRef,setQRef]=useState(()=>`QT-${new Date().getFullYear()}-${String(Math.floor(Math.random()*900)+100)}`);
  const[qDate,setQDate]=useState(new Date().toISOString().slice(0,10));
  const[qValidity,setQValidity]=useState("30");
  const[qNotes,setQNotes]=useState("");
  const[qCustomerManual,setQCustomerManual]=useState("");
  const[qCustomerAddr,setQCustomerAddr]=useState("");
  const[useManualCustomer,setUseManualCustomer]=useState(false);

  useEffect(()=>{
    // 1. Load from localStorage instantly
    const{data:localCat,ts:localCatTs}=loadCatLocal();
    const{data:localQuot}=loadQuotLocal();
    if(localCat&&localCat.length>0){setProducts(localCat);setLoading(false);}
    if(localQuot&&localQuot.length>0){setQuotes(localQuot);setLoading(false);}

    // 2. Always fetch from Supabase to get latest cross-device data
    (async()=>{
      try{
        const catData=await sbGet(CAT_KEY);
        const cloudProds=catData?.products||[];
        const localProds=localCat||[];
        const cloudTs=catData?._updatedAt||catData?.ts||"";
        const localIsNewer=localCatTs&&cloudTs&&(new Date(localCatTs)>new Date(cloudTs));

        if(cloudProds.length>0&&localProds.length===0){
          // Other device: load from cloud
          setProducts(cloudProds);saveCatLocal(cloudProds);
          setSyncStatus("ok");setSyncMsg(`✓ ${cloudProds.length} produits chargés depuis le cloud`);
        } else if(cloudProds.length>0&&localProds.length>0){
          if(localIsNewer){
            // Local newer: merge and push
            const cloudPNs=new Set(cloudProds.map((p:any)=>p.pn));
            const localOnly=localProds.filter((p:any)=>!cloudPNs.has(p.pn));
            const merged=[...cloudProds,...localOnly];
            if(merged.length>localProds.length){setProducts(merged);saveCatLocal(merged);}
            await sbSet(CAT_KEY,{products:merged.length>localProds.length?merged:localProds,ts:new Date().toISOString()});
            setSyncStatus("ok");setSyncMsg(`✓ ${Math.max(merged.length,localProds.length)} produits synchronisés`);
          } else {
            // Cloud newer or equal: merge cloud+local
            const cloudPNs=new Set(cloudProds.map((p:any)=>p.pn));
            const localOnly=localProds.filter((p:any)=>!cloudPNs.has(p.pn));
            const merged=[...cloudProds,...localOnly];
            setProducts(merged);saveCatLocal(merged);
            setSyncStatus("ok");setSyncMsg(`✓ ${merged.length} produits synchronisés`);
          }
        } else if(cloudProds.length===0&&localProds.length>0){
          // Cloud empty: push local
          await sbSet(CAT_KEY,{products:localProds,ts:localCatTs||new Date().toISOString()});
          setSyncStatus("ok");setSyncMsg(`✓ ${localProds.length} produits envoyés vers le cloud`);
        } else {
          setSyncStatus("idle");setSyncMsg("Catalogue vide — importez des fichiers");
        }

        const quotData=await sbGet(QUOT_KEY);
        if(quotData?.quotes?.length>0){
          setQuotes(quotData.quotes);saveQuotLocal(quotData.quotes);
        }
      }catch(e){
        console.warn("[Catalogue] Load error",e);
        setSyncStatus("error");setSyncMsg("⚠️ Erreur de connexion cloud");
      }
      setLoading(false);
    })();
  },[]);

  const saveProducts=async(p:any[])=>{
    setProducts(p);
    saveCatLocal(p); // Immediate local save
    setSyncStatus("syncing");setSyncMsg("Synchronisation…");
    const ts=new Date().toISOString();
    const ok=await sbSet(CAT_KEY,{products:p,ts});
    if(ok){
      setSyncStatus("ok");
      setSyncMsg(`✓ ${p.length} produits synchronisés — ${new Date().toLocaleTimeString("fr-FR")}`);
    } else {
      setSyncStatus("error");
      setSyncMsg("⚠️ Sync cloud échouée — données sauvegardées localement");
    }
  };
  const saveQuotes=async(q:any[])=>{
    setQuotes(q);
    saveQuotLocal(q);
    await sbSet(QUOT_KEY,{quotes:q,ts:new Date().toISOString()});
  };

  const forceSync=async()=>{
    setSyncStatus("syncing");setSyncMsg("Connexion au cloud…");
    try{
      // 1. Always fetch cloud first
      const catData=await sbGet(CAT_KEY);
      const{data:localCat,ts:localTs}=loadCatLocal();
      const cloudProds=catData?.products||[];
      const localProds=localCat||products||[];
      const cloudTs=catData?._updatedAt||catData?.ts||"";

      if(cloudProds.length===0&&localProds.length===0){
        setSyncStatus("idle");setSyncMsg("Catalogue vide des deux côtés");return;
      }
      if(cloudProds.length===0&&localProds.length>0){
        // Push local to cloud
        const ts=new Date().toISOString();
        const ok=await sbSet(CAT_KEY,{products:localProds,ts});
        setSyncStatus(ok?"ok":"error");
        setSyncMsg(ok?`✓ ${localProds.length} produits envoyés vers le cloud`:"⚠️ Échec envoi cloud");
        return;
      }
      if(localProds.length===0&&cloudProds.length>0){
        // Pull from cloud
        setProducts(cloudProds);saveCatLocal(cloudProds);
        setSyncStatus("ok");
        setSyncMsg(`✓ ${cloudProds.length} produits chargés depuis le cloud`);
        return;
      }
      // Both have data — merge intelligently
      const localIsNewer=localTs&&cloudTs&&(new Date(localTs)>new Date(cloudTs));
      if(localIsNewer){
        // Merge: local + cloud-only products
        const localPNs=new Set(localProds.map((p:any)=>p.pn));
        const cloudOnly=cloudProds.filter((p:any)=>!localPNs.has(p.pn));
        const merged=[...localProds,...cloudOnly];
        setProducts(merged);saveCatLocal(merged);
        const ts=new Date().toISOString();
        await sbSet(CAT_KEY,{products:merged,ts});
        setSyncStatus("ok");
        setSyncMsg(`✓ ${merged.length} produits (fusion local+cloud)`);
      } else {
        // Cloud is newer — merge: cloud + local-only products
        const cloudPNs=new Set(cloudProds.map((p:any)=>p.pn));
        const localOnly=localProds.filter((p:any)=>!cloudPNs.has(p.pn));
        const merged=[...cloudProds,...localOnly];
        setProducts(merged);saveCatLocal(merged);
        if(localOnly.length>0){
          const ts=new Date().toISOString();
          await sbSet(CAT_KEY,{products:merged,ts});
        }
        setSyncStatus("ok");
        setSyncMsg(`✓ ${merged.length} produits synchronisés`);
      }
    }catch(e){
      setSyncStatus("error");
      setSyncMsg("⚠️ Erreur de connexion");
      console.warn("[forceSync]",e);
    }
  };

  // ── File upload & parse ────────────────────────────────────────────────────
  const handleMultiFile=async(e:any)=>{
    const files=Array.from(e.target.files||[]) as File[];
    if(!files.length)return;
    if(files.length===1){
      // Single file — show preview as before
      await handleFile(files[0]);
    } else {
      // Multiple files — process all directly without preview
      setMultiFiles(files);
      setUploading(true);
      setUploadMsg(`Traitement de ${files.length} fichiers…`);
      let totalImported=0,totalUpdated=0;
      const newProducts=[...products];
      for(let fi=0;fi<files.length;fi++){
        const file=files[fi];
        setProcessingIdx(fi);
        setUploadMsg(`Traitement ${fi+1}/${files.length} : ${file.name}…`);
        const rows=await parseExcel(file);
        if(!rows.length)continue;
        const{headerIdx,colMap:detected,}=findHeaderRow(rows);
        const fileCustomer=extractCustomer(rows,headerIdx);
        const dataRows=rows.slice(headerIdx+1).filter((r:any)=>r.some((x:any)=>x!==null&&x!==undefined&&x!==""));
        for(const row of dataRows){
          const pnVal=String(row[detected.pn]||"").trim();
          if(!pnVal||pnVal==="PN"||pnVal==="Part Number")continue;
          const descVal=detected.desc>=0?String(row[detected.desc]||"").trim():"";
          const rawPrice=detected.price>=0?String(row[detected.price]||""):"";
          let priceVal=0;
          if(rawPrice){
            let p=rawPrice.trim().replace(/[€$£\s]/g,"");
            const lastComma=p.lastIndexOf(","),lastDot=p.lastIndexOf(".");
            if(lastComma>lastDot)p=p.replace(/\./g,"").replace(",",".");
            else p=p.replace(/,/g,"");
            priceVal=parseFloat(p)||0;
            if(priceVal>1000000)priceVal=0;
          }
          const custVal=detected.customer>=0?String(row[detected.customer]||"").trim():fileCustomer;
          const today=new Date().toISOString().slice(0,10);
          const existing=newProducts.findIndex((p:any)=>p.pn===pnVal);
          if(existing>=0){
            if(priceVal>0){
              if(!newProducts[existing].prices)newProducts[existing].prices=[];
              newProducts[existing].prices.push({price:priceVal,currency:"EUR",customer:custVal,date:today,source:file.name});
            }
            if(descVal&&descVal!==pnVal&&!newProducts[existing].description)newProducts[existing].description=descVal;
            totalUpdated++;
          } else {
            newProducts.push({
              id:Date.now().toString()+Math.random().toString(36).slice(2,6),
              pn:pnVal,description:descVal!==pnVal?descVal:"",
              prices:priceVal>0?[{price:priceVal,currency:"EUR",customer:custVal,date:today,source:file.name}]:[],
              lastUpdated:today
            });
            totalImported++;
          }
        }
      }
      await saveProducts(newProducts);
      setUploadMsg(`✓ ${totalImported} produits ajoutés, ${totalUpdated} mis à jour (${files.length} fichiers traités)`);
      setMultiFiles([]);setProcessingIdx(-1);setUploading(false);
      if(fileRef.current)fileRef.current.value="";
    }
  };

  const handleFile=async(file:File)=>{
    if(!file)return;
    setUploading(true);setUploadMsg("Analyse du fichier…");
    const ext=file.name.split(".").pop()?.toLowerCase();
    if(ext==="xlsx"||ext==="xls"||ext==="csv"){
      const rows=await parseExcel(file);
      if(rows.length>0){
        const{headerIdx,colMap:detected}=findHeaderRow(rows);
        const customer=extractCustomer(rows,headerIdx);
        const dataRows=rows.slice(headerIdx+1).filter((r:any)=>r.some((x:any)=>x!==null&&x!==undefined&&x!==""));
        setColMap(detected);
        setAllRows([rows[headerIdx],...dataRows]); // header + all data rows
        setPreviewRows([rows[headerIdx],...dataRows.slice(0,5)]); // header + 5 rows preview
        setPendingFile(file.name);
        const clientHint=customer?` · Customer détecté : ${customer}`:"";
        setUploadMsg(`${dataRows.length} lignes détectées (en-tête ligne ${headerIdx+1})${clientHint} — vérifiez le mapping`);
        setUploading(false);
        return;
      }
    }
    setUploadMsg("Format non supporté pour l'extraction automatique. Utilisez Excel (.xlsx).");
    setUploading(false);
    if(fileRef.current)fileRef.current.value="";
  };

  const confirmImport=async()=>{
    if(!allRows.length||colMap.pn<0){setUploadMsg("Colonne PN non mappée — assignez la colonne PN dans le tableau ci-dessous");return;}
    setUploading(true);setUploadMsg("Import en cours…");
    const fileCustomer=uploadMsg.includes("Customer détecté")?uploadMsg.split("Customer détecté : ")[1]?.split(" —")[0]?.trim()||""  :"";

    // Detect if file has multiple periods (like BERNABE EXTRA DISCOUNT)
    const allDataRows=allRows.slice(1);
    const hasPeriods=allDataRows.some((r:any)=>isPeriodLabel(r));
    let imported=0,updated=0;
    const newProducts=[...products];

    if(hasPeriods){
      // Multi-period file: scan for period labels and process each section
      setUploadMsg("Fichier multi-périodes détecté — import en cours…");
      let currentDate=new Date().toISOString().slice(0,10);
      let currentColMap={...colMap};

      for(const row of allDataRows){
        // Check if this row is a period label
        const period=isPeriodLabel(row);
        if(period){
          currentDate=frMonthToISO(period);
          setUploadMsg(`Import: ${period}…`);
          continue;
        }
        // Check if this row is a header row
        const rowStr=row.map((x:any)=>String(x||"").toLowerCase());
        const isHeader=rowStr.some((s:string)=>s==="pn"||s==="product"||s==="item");
        if(isHeader){
          currentColMap=detectColumns(row.map((x:any)=>String(x||"")));
          continue;
        }
        // Process data row
        const pnCol=currentColMap.pn>=0?currentColMap.pn:1; // fallback col 1 (PN)
        const descCol=currentColMap.desc>=0?currentColMap.desc:2; // fallback col 2 (PRODUCT)
        const priceCol=currentColMap.price>=0?currentColMap.price:4; // fallback col 4 (UP)
        const pnVal=String(row[pnCol]||"").trim();
        if(!pnVal||pnVal==="PN"||/^(ITEM|N°)$/i.test(pnVal)||isNaN(Number(pnVal.replace(/[^0-9]/g,""))&&pnVal.length>10?0:1)){}
        if(!pnVal||pnVal==="PN"||pnVal==="Part Number")continue;
        const priceRaw=String(row[priceCol]||"").trim();
        if(priceRaw.startsWith("="))continue; // skip formula cells without value
        let priceVal=0;
        if(priceRaw){
          let p=priceRaw.replace(/[€$£\s]/g,"");
          const lc=p.lastIndexOf(","),ld=p.lastIndexOf(".");
          if(lc>ld)p=p.replace(/\./g,"").replace(",",".");
          else p=p.replace(/,/g,"");
          priceVal=parseFloat(p)||0;
          if(priceVal>999999)priceVal=0;
        }
        const descVal=String(row[descCol]||"").trim();
        const existing=newProducts.findIndex((p:any)=>String(p.pn)===pnVal);
        if(existing>=0){
          if(!newProducts[existing].prices)newProducts[existing].prices=[];
          // Don't add duplicate price for same date
          const alreadyHas=newProducts[existing].prices.some((pr:any)=>pr.date===currentDate&&pr.price===priceVal);
          if(priceVal>0&&!alreadyHas){
            newProducts[existing].prices.push({price:priceVal,currency:"EUR",customer:fileCustomer,date:currentDate,source:pendingFile});
          }
          if(descVal&&descVal!==pnVal&&!newProducts[existing].description)newProducts[existing].description=descVal;
          updated++;
        } else {
          if(!pnVal||pnVal.length<4)continue;
          newProducts.push({
            id:Date.now().toString()+Math.random().toString(36).slice(2,6),
            pn:pnVal,description:descVal!==pnVal?descVal:"",
            prices:priceVal>0?[{price:priceVal,currency:"EUR",customer:fileCustomer,date:currentDate,source:pendingFile}]:[],
            lastUpdated:currentDate
          });
          imported++;
        }
      }
    } else {
    // Standard single-period file
    const rows=allDataRows;
    for(const row of rows){
      const pnVal=String(row[colMap.pn]||"").trim();
      if(!pnVal||pnVal==="PN"||pnVal==="Part Number")continue; // skip header leftovers
      const rawPrice=colMap.price>=0?String(row[colMap.price]||""):""
      // Handle French number format: "1 234,56" or "1.234,56" or "1234.56"
      let priceVal=0;
      if(rawPrice){
        let p=rawPrice.trim();
        // Remove currency symbols and spaces
        p=p.replace(/[€$£\s]/g,"");
        // Detect format: if comma before dot = English (1,234.56), if dot before comma = French (1.234,56)
        const lastComma=p.lastIndexOf(",");
        const lastDot=p.lastIndexOf(".");
        if(lastComma>lastDot){
          // French format: 1.234,56 → remove dots, replace comma with dot
          p=p.replace(/\./g,"").replace(",",".");
        } else if(lastDot>lastComma){
          // English format: 1,234.56 → remove commas
          p=p.replace(/,/g,"");
        } else {
          // No separator or same position
          p=p.replace(/[^0-9.]/g,"");
        }
        priceVal=parseFloat(p)||0;
        // Sanity check: if price > 1,000,000 it's probably a parse error
        if(priceVal>1000000){
          console.warn("[Import] Suspicious price:",rawPrice,"→",priceVal,"for PN:",row[colMap.pn]);
          priceVal=0; // Ignore suspicious prices
        }
      }
      const descVal=colMap.desc>=0?String(row[colMap.desc]||"").trim():"";
      const qtyVal=colMap.qty>=0?parseInt(String(row[colMap.qty]||"0"))||0:0;
      const custVal=colMap.customer>=0?String(row[colMap.customer]||"").trim():"";
      const availVal=colMap.avail>=0?String(row[colMap.avail]||"").trim():"";
      const today=new Date().toISOString().slice(0,10);
      const existing=newProducts.findIndex((p:any)=>p.pn===pnVal);
      if(existing>=0){
        // Add price entry if new
        if(priceVal>0){
          if(!newProducts[existing].prices)newProducts[existing].prices=[];
          newProducts[existing].prices.push({price:priceVal,currency:"EUR",customer:custVal,date:today,source:pendingFile});
        }
        if(descVal&&descVal!==pnVal&&!newProducts[existing].description)newProducts[existing].description=descVal;
        updated++;
      } else {
        newProducts.push({
          id:Date.now().toString()+Math.random().toString(36).slice(2,6),
          pn:pnVal,description:descVal!==pnVal?descVal:"",
          prices:priceVal>0?[{price:priceVal,currency:"EUR",customer:custVal,date:today,source:pendingFile}]:[],
          lastQty:qtyVal,lastAvail:availVal,lastUpdated:today
        });
        imported++;
      }
    }
    await saveProducts(newProducts);
    } // end else standard import
    const noPrice=newProducts.filter((p:any)=>p.prices?.length===0).length;
    const periods=allDataRows.filter((r:any)=>isPeriodLabel(r)).length;
    const periodInfo=periods>0?` · ${periods} périodes détectées`:"";
    setUploadMsg(`✓ ${imported} produits ajoutés, ${updated} mis à jour${periodInfo}${noPrice>0?` · ⚠️ ${noPrice} sans prix`:""}` );
    setPreviewRows([]);setAllRows([]);setPendingFile("");
    setUploading(false);
    if(fileRef.current)fileRef.current.value="";
  };

  // ── Quote line helpers ─────────────────────────────────────────────────────
  const lookupPN=(idx:number,pn:string)=>{
    // Exact match first, then partial
    const exact=products.find((p:any)=>p.pn.toLowerCase()===pn.toLowerCase());
    const partial=pn.length>=3?products.filter((p:any)=>
      p.pn.toLowerCase().includes(pn.toLowerCase())||
      (p.description||"").toLowerCase().includes(pn.toLowerCase())
    ):[];
    const found=exact?[exact,...partial.filter((p:any)=>p.pn!==exact.pn)]:partial;
    const bestMatch=found[0];
    const opts=found.flatMap((p:any)=>(p.prices||[]).map((pr:any)=>({...pr,pn:p.pn,desc:p.description})));
    // Sort by date descending
    opts.sort((a:any,b:any)=>new Date(b.date).getTime()-new Date(a.date).getTime());
    const newDesc=bestMatch?.description&&bestMatch.description.trim()&&bestMatch.description!==pn
      ?bestMatch.description
      :"";
    setQLines(lines=>lines.map((l:any,i:number)=>i===idx?{...l,
      pn,
      desc:newDesc,
      priceOptions:opts,
      selectedPriceIdx:opts.length>0?0:-1,
      unitPrice:opts.length>0?opts[0].price:l.unitPrice
    }:l));
  };

  // Search by description — returns matching products
  const searchByDesc=(term:string):any[]=>{
    if(!term||term.length<2)return[];
    const t=term.toLowerCase();
    return products.filter((p:any)=>{
      const desc=(p.description||"").toLowerCase();
      const pn=(p.pn||"").toLowerCase();
      // Split search term into words for generic matching
      const words=t.split(/\s+/).filter((w:string)=>w.length>1);
      return words.every((w:string)=>desc.includes(w)||pn.includes(w));
    }).slice(0,8);
  };

  // When user selects a product from description suggestions
  const selectFromDesc=(lineIdx:number,product:any)=>{
    lookupPN(lineIdx, product.pn);
  };

  const updateLine=(idx:number,field:string,val:any)=>{
    setQLines(lines=>lines.map((l:any,i:number)=>i===idx?{...l,[field]:val}:l));
  };

  const selectPrice=(lineIdx:number,priceIdx:number)=>{
    const opt=qLines[lineIdx].priceOptions[priceIdx];
    setQLines(lines=>lines.map((l:any,i:number)=>i===lineIdx?{...l,selectedPriceIdx:priceIdx,unitPrice:opt?.price||l.unitPrice}:l));
  };

  const addLine=()=>setQLines(l=>[...l,{pn:"",desc:"",qty:1,unitPrice:0,avail:"",priceOptions:[],selectedPriceIdx:-1}]);
  const removeLine=(i:number)=>setQLines(l=>l.filter((_:any,j:number)=>j!==i));
  const totalHT=qLines.reduce((s:number,l:any)=>s+(+l.qty||0)*(+l.unitPrice||0),0);

  // ── Generate DRAFT quote (no header) ────────────────────────────────────────
  const generateDraftQuote=async()=>{
    const effectiveCustomer=useManualCustomer?qCustomerManual:qCustomer;
    if(!effectiveCustomer){alert('Sélectionnez ou saisissez un client');return;}
    if(!qLines.some((l:any)=>l.pn&&l.unitPrice>0)){alert('Ajoutez au moins une ligne avec PN et prix');return;}
    // FIX: pas de validation avail pour le draft — affiche TBC si vide
    const validLines=qLines.filter((l:any)=>l.pn);
    const dateStr=new Date(qDate).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'});
    const totStr=totalHT.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2});
    const docTitle='Draft Quote - '+effectiveCustomer+' - '+qRef;
    const addrHtml=(useManualCustomer&&qCustomerAddr)
      ?'<div style="font-size:11px;color:#333;margin-top:3px">'+qCustomerAddr.split('\n').join('<br/>')+'</div>'
      :'';
    const linesHtml=validLines.map((l:any)=>[
      '<tr>',
      '<td style="padding:7px 10px;border:1px solid #DBEAFE;font-family:Arial,Helvetica,sans-serif;font-size:11px">'+l.pn+'</td>',
      '<td style="padding:7px 10px;border:1px solid #DBEAFE;font-family:Arial,Helvetica,sans-serif;font-size:11px">'+(l.desc||'&mdash;')+'</td>',
      '<td style="padding:7px 10px;border:1px solid #DBEAFE;font-family:Arial,Helvetica,sans-serif;font-size:11px;text-align:right">'+(+l.unitPrice||0).toLocaleString('fr-FR',{minimumFractionDigits:2})+'</td>',
      '<td style="padding:7px 10px;border:1px solid #DBEAFE;font-family:Arial,Helvetica,sans-serif;font-size:11px;text-align:center">'+l.qty+'</td>',
      '<td style="padding:7px 10px;border:1px solid #DBEAFE;font-family:Arial,Helvetica,sans-serif;font-size:11px;text-align:right">'+((+l.qty||0)*(+l.unitPrice||0)).toLocaleString('fr-FR',{minimumFractionDigits:2})+'</td>',
      '<td style="padding:7px 10px;border:1px solid #DBEAFE;font-family:Arial,Helvetica,sans-serif;font-size:11px">'+(l.avail||'TBC')+'</td>',
      '</tr>'
    ].join('')).join('');
    const thStyle=(align:string,w2:string='')=>'padding:8px 10px;border:1px solid #93C5FD;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;text-align:'+align+(w2?';width:'+w2:'');
    const html=`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${docTitle}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  @page{size:A4 portrait;margin:12mm 14mm}
  body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#000;background:#fff;padding:12mm 14mm;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  @media print{body{padding:0}.no-print{display:none!important}}
  *{-webkit-user-select:text!important;user-select:text!important;cursor:text}
  button{cursor:pointer!important}
  .ttl{font-size:15px;font-weight:bold;border:2px solid #000;padding:6px 22px;display:inline-block;font-family:Arial,Helvetica,sans-serif}
  table{border-collapse:collapse;width:100%}
  td,th{font-family:Arial,Helvetica,sans-serif;font-size:11px}
</style>
</head>
<body>
<div class="no-print" style="position:fixed;top:10px;right:10px;z-index:9999;display:flex;gap:8px;background:rgba(255,255,255,.92);padding:8px 10px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,.2)">
  <button onclick="window.print()" style="background:#1D4ED8;color:#fff;border:none;border-radius:6px;padding:8px 16px;font-size:12px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">&#128424; Imprimer / PDF</button>
  <button onclick="window.close()" style="background:#6B7280;color:#fff;border:none;border-radius:6px;padding:8px 12px;font-size:12px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">&times; Fermer</button>
</div>
<table style="width:100%;margin-bottom:14px">
  <tr>
    <td style="width:33%"></td>
    <td style="width:34%;text-align:center"><span class="ttl">DRAFT QUOTE</span></td>
    <td style="width:33%;text-align:right;font-size:11px;font-family:Arial,Helvetica,sans-serif">${dateStr}</td>
  </tr>
</table>
<table style="width:100%;margin-bottom:20px">
  <tr>
    <td style="width:55%;vertical-align:top">
      <div style="font-weight:bold;font-size:14px;font-family:Arial,Helvetica,sans-serif">${effectiveCustomer}</div>
      ${addrHtml}
    </td>
    <td style="width:45%;text-align:right;vertical-align:middle;font-size:10px;color:#888;font-family:Arial,Helvetica,sans-serif">
      Réf : ${qRef}<br/>
      Validité : ${qValidity} jours
    </td>
  </tr>
</table>
<table style="width:100%;border-collapse:collapse;margin-bottom:4px">
  <thead>
    <tr style="background:#BFDBFE">
      <th style="${thStyle('left','110px')}">p/n</th>
      <th style="${thStyle('left')}">Product</th>
      <th style="${thStyle('right','120px')}">UNIT PRICE</th>
      <th style="${thStyle('center','60px')}">Qty</th>
      <th style="${thStyle('right','120px')}">Total (&euro;)</th>
      <th style="${thStyle('left','140px')}">Availability</th>
    </tr>
  </thead>
  <tbody>${linesHtml}</tbody>
  <tfoot>
    <tr>
      <td colspan="4" style="padding:9px 10px;text-align:right;font-weight:bold;font-family:Arial,Helvetica,sans-serif">TOT=</td>
      <td style="padding:9px 10px;text-align:right;font-weight:bold;font-size:14px;border-top:2px solid #000;font-family:Arial,Helvetica,sans-serif">${totStr}</td>
      <td></td>
    </tr>
  </tfoot>
</table>
<table style="width:100%;margin-top:20px">
  <tr>
    <td style="width:60%;vertical-align:top;padding-right:20px">
      ${qNotes?`<div style="border-left:3px solid #2563EB;padding:8px 12px;background:#F8FAFF;border-radius:0 6px 6px 0">
        <div style="font-size:9px;font-weight:bold;color:#2563EB;font-family:Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Notes / Conditions</div>
        <div style="font-size:11px;color:#333;font-family:Arial,Helvetica,sans-serif;white-space:pre-wrap;line-height:1.5">${qNotes}</div>
      </div>`:''}
    </td>
    <td style="width:40%;vertical-align:bottom;text-align:right">
      ${qValidity?`<p style="font-size:10px;color:#555;font-family:Arial,Helvetica,sans-serif">Valable ${qValidity} jours.</p>`:''}
    </td>
  </tr>
</table>
</body></html>`;
    // FIX: ouvrir la fenêtre avant d'écrire le contenu (meilleure compatibilité)
    const w=window.open('','_blank');
    if(!w){
      alert("Popup bloqué par le navigateur.\nAutorisez les popups pour ce site dans votre barre d'adresse, puis réessayez.");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  // ── Generate draft Excel (.xlsx via SheetJS) ──────────────────────────────
  const generateDraftExcel=async()=>{
    const effectiveCustomer=useManualCustomer?qCustomerManual:qCustomer;
    if(!effectiveCustomer){alert('Sélectionnez ou saisissez un client');return;}
    if(!qLines.some((l:any)=>l.pn&&l.unitPrice>0)){alert('Ajoutez au moins une ligne avec PN et prix');return;}
    const validLines=qLines.filter((l:any)=>l.pn);
    const dateStr=new Date(qDate).toLocaleDateString('fr-FR');
    const fileName=`Draft_${effectiveCustomer}_${qRef}_${qDate}.xlsx`;
    const totalHT_val=validLines.reduce((s:number,l:any)=>s+(+l.qty||0)*(+l.unitPrice||0),0);

    // Load ExcelJS from CDN (always available, no CSP issue)
    const loadExcelJS=():Promise<any>=>new Promise((resolve,reject)=>{
      if((window as any).ExcelJS){resolve((window as any).ExcelJS);return;}
      const s=document.createElement('script');
      s.src='https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
      s.crossOrigin='anonymous';
      s.onload=()=>resolve((window as any).ExcelJS);
      s.onerror=()=>reject(new Error('ExcelJS load failed'));
      document.head.appendChild(s);
    });
    let ExcelJS:any;
    try{ExcelJS=await loadExcelJS();}
    catch{alert('Impossible de charger ExcelJS. Vérifiez votre connexion internet.');return;}

    const wb=new ExcelJS.Workbook();
    wb.created=new Date();
    const ws=wb.addWorksheet('Draft Quote',{pageSetup:{paperSize:9,orientation:'portrait',fitToPage:true,fitToWidth:1,fitToHeight:0},properties:{defaultColWidth:12}});

    ws.columns=[
      {width:11},  // A: P/N
      {width:38},  // B: Désignation
      {width:11},  // C: P.U. (€)
      {width:5},   // D: Qté
      {width:11},  // E: Total (€)
      {width:17},  // F: Disponibilité
    ];
    ws.pageSetup.margins={left:0.5,right:0.5,top:0.6,bottom:0.6,header:0.3,footer:0.3};

    // ── Title ──────────────────────────────────────────────────────────────
    ws.getRow(1).height=34;
    // Left: DRAFT QUOTE — CLIENT (cols A-D)
    ws.mergeCells('A1:D1');
    const titleCell=ws.getCell('A1');
    titleCell.value=`DRAFT QUOTE — ${effectiveCustomer}`;
    titleCell.font={bold:true,size:14,color:{argb:'FF1D4ED8'},name:'Arial'};
    titleCell.alignment={vertical:'middle'};
    // Right: GRUNDFOS in blue (cols E-F)
    ws.mergeCells('E1:F1');
    const grundCell=ws.getCell('E1');
    grundCell.value='GRUNDFOS';
    grundCell.font={bold:true,size:14,color:{argb:'FF2563EB'},name:'Arial'};
    grundCell.alignment={horizontal:'right',vertical:'middle'};

    // ── Subtitle ───────────────────────────────────────────────────────────
    ws.mergeCells('A2:F2');
    const subCell=ws.getCell('A2');
    subCell.value=`Réf : ${qRef}   |   Date : ${dateStr}   |   Validité : ${qValidity} jours`;
    subCell.font={size:9,color:{argb:'FF6B7280'},name:'Arial'};
    subCell.alignment={vertical:'middle'};
    subCell.border={bottom:{style:'thin',color:{argb:'FFE5EAF0'}}};
    ws.getRow(2).height=20;

    // ── Spacer ─────────────────────────────────────────────────────────────
    ws.getRow(3).height=10;

    // ── Headers ────────────────────────────────────────────────────────────
    const hdrRow=ws.getRow(4);
    ws.getRow(4).height=24;
    ['P/N','Désignation','P.U. (€)','Qté','Total (€)','Disponibilité'].forEach((h,i)=>{
      const c=hdrRow.getCell(i+1);
      c.value=h;
      c.font={bold:true,size:9,color:{argb:'FF1E3A5F'},name:'Arial'};
      c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFBFDBFE'}};
      c.alignment={horizontal:'center',vertical:'middle'};
      c.border={top:{style:'thin',color:{argb:'FF93C5FD'}},bottom:{style:'thin',color:{argb:'FF93C5FD'}},left:{style:'thin',color:{argb:'FF93C5FD'}},right:{style:'thin',color:{argb:'FF93C5FD'}}};
    });

    // ── Data rows ──────────────────────────────────────────────────────────
    const DR=5;
    const bs={top:{style:'thin',color:{argb:'FFE5EAF0'}},bottom:{style:'thin',color:{argb:'FFE5EAF0'}},left:{style:'thin',color:{argb:'FFE5EAF0'}},right:{style:'thin',color:{argb:'FFE5EAF0'}}};
    validLines.forEach((l:any,i:number)=>{
      const rowNum=DR+i;
      const row=ws.getRow(rowNum);
      row.height=28; // taller rows = more breathing room
      const price=+l.unitPrice||0;
      const qty=+(l.qty??1); // FIX: use ?? not || so qty=0 stays 0

      const cA=row.getCell(1); cA.value=String(l.pn||''); cA.font={size:9,name:'Arial'}; cA.border=bs; cA.alignment={vertical:'middle'};
      const cB=row.getCell(2); cB.value=String(l.desc||''); cB.font={size:9,name:'Arial'}; cB.border=bs; cB.alignment={vertical:'middle',wrapText:false};
      const cC=row.getCell(3); cC.value=price; cC.numFmt='#,##0.00'; cC.font={size:9,color:{argb:'FF374151'},name:'Arial'}; cC.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF8FAFC'}}; cC.alignment={horizontal:'right',vertical:'middle'}; cC.border=bs;
      const cD=row.getCell(4); cD.value=qty; cD.numFmt='0'; cD.font={size:9,name:'Arial'}; cD.alignment={horizontal:'center',vertical:'middle'}; cD.border=bs;
      const cE=row.getCell(5); cE.value={formula:`C${rowNum}*D${rowNum}`,result:price*qty}; cE.numFmt='#,##0.00'; cE.font={size:9,name:'Arial'}; cE.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF0FDF4'}}; cE.alignment={horizontal:'right',vertical:'middle'}; cE.border=bs;
      const cF=row.getCell(6); cF.value=String(l.avail||'TBC'); cF.font={size:9,name:'Arial'}; cF.border=bs; cF.alignment={vertical:'middle'};
    });

    // ── Spacer ─────────────────────────────────────────────────────────────
    const spacerR=DR+validLines.length;
    ws.getRow(spacerR).height=16;

    // ── Total row ──────────────────────────────────────────────────────────
    const totalR=spacerR+1;
    ws.mergeCells(`A${totalR}:D${totalR}`);
    const tLabel=ws.getCell(`A${totalR}`);
    tLabel.value='TOTAL HT';
    tLabel.font={bold:true,size:10,color:{argb:'FF1E3A5F'},name:'Arial'};
    tLabel.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFDBEAFE'}};
    tLabel.alignment={horizontal:'right',vertical:'middle'};
    ws.getRow(totalR).height=30;
    const tVal=ws.getCell(`E${totalR}`);
    tVal.value={formula:`SUM(E${DR}:E${spacerR-1})`,result:totalHT_val};
    tVal.numFmt='#,##0.00';
    tVal.font={bold:true,size:11,color:{argb:'FF1E3A5F'},name:'Arial'};
    tVal.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFDBEAFE'}};
    tVal.alignment={horizontal:'right',vertical:'middle'};

    // ── Notes ──────────────────────────────────────────────────────────────
    let nR=totalR+2;
    if(qNotes){
      ws.getRow(nR).height=22;
      ws.mergeCells(`A${nR}:F${nR}`);
      const nLabel=ws.getCell(`A${nR}`);
      nLabel.value='NOTES / CONDITIONS';
      nLabel.font={bold:true,size:9,color:{argb:'FF1D4ED8'},name:'Arial'};
      nLabel.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFEFF6FF'}};
      nR++;
      const charsPerLine=90;
      const noteLines=Math.ceil(String(qNotes).length/charsPerLine)+1;
      ws.getRow(nR).height=Math.max(40,noteLines*14);
      ws.mergeCells(`A${nR}:F${nR}`);
      const nVal=ws.getCell(`A${nR}`);
      nVal.value=String(qNotes);
      nVal.font={size:9,name:'Arial'};
      nVal.alignment={wrapText:true,vertical:'top'};
      nR+=2;
    }
    if(qValidity){
      ws.getRow(nR).height=18;
      ws.getCell(`A${nR}`).value=`Valable ${qValidity} jours.`;
      ws.getCell(`A${nR}`).font={size:9,color:{argb:'FF6B7280'},name:'Arial'};
    }

    // ── Sheet protection: only D (Qté) is editable ─────────────────────────

    // ── Download ───────────────────────────────────────────────────────────
    const buf:ArrayBuffer=await wb.xlsx.writeBuffer();
    const blob=new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url; a.download=fileName;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Generate quote PDF ─────────────────────────────────────────────────────
  const generateQuote=async()=>{
    const effectiveCustomer=useManualCustomer?qCustomerManual:qCustomer;
    if(!effectiveCustomer){alert("Sélectionnez ou saisissez un client");return;}
    if(!qLines.some((l:any)=>l.pn&&l.unitPrice>0)){alert("Ajoutez au moins une ligne avec PN et prix");return;}
    const missingAvail=qLines.filter((l:any)=>l.pn&&!l.avail);
    if(missingAvail.length>0){alert("Délai de livraison manquant sur "+missingAvail.length+" ligne(s).");return;}
    // Save quote
    const quote={
      id:Date.now().toString(),number:qRef,client:effectiveCustomer,date:qDate,
      validity:qValidity,notes:qNotes,
      lines:qLines.filter((l:any)=>l.pn),
      totalHT,
      createdAt:new Date().toISOString()
    };
    await saveQuotes([quote,...quotes].slice(0,50));
    // Print
    const w=window.open("","_blank","width=900,height=700");
    if(!w)return;
    const linesHTML=qLines.filter((l:any)=>l.pn).map((l:any,i:number)=>`
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #E5EAF0;font-size:11px;font-weight:600;color:#1E3A5F">${l.pn}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #E5EAF0;font-size:11px">${l.desc||"—"}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #E5EAF0;font-size:11px;text-align:center">${l.qty}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #E5EAF0;font-size:11px;text-align:right">${fmt(+l.unitPrice)} €</td>
        <td style="padding:8px 10px;border-bottom:1px solid #E5EAF0;font-size:11px;text-align:right;font-weight:700;color:#1E3A5F">${fmt((+l.qty)*(+l.unitPrice))} €</td>
        <td style="padding:8px 10px;border-bottom:1px solid #E5EAF0;font-size:11px;color:#6B7280">${l.avail}</td>
      </tr>`).join("");
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Devis ${qRef}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#0D1B2A;background:#fff;padding:20mm 18mm;}
  @media print{body{padding:15mm 14mm;}}
</style></head><body>
  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:30px;padding-bottom:20px;border-bottom:3px solid #1D4ED8">
    <div>
      <div style="font-size:22px;font-weight:900;color:#1D4ED8;letter-spacing:-.02em">GRUNDFOS</div>
      <div style="font-size:11px;color:#6B7280;margin-top:2px">kyao@grundfos.com</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:18px;font-weight:800;color:#0D1B2A">DEVIS</div>
      <div style="font-size:13px;font-weight:700;color:#1D4ED8;margin-top:4px">${qRef}</div>
      <div style="font-size:11px;color:#6B7280;margin-top:4px">Date : ${new Date(qDate).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})}</div>
      <div style="font-size:11px;color:#6B7280">Validité : ${qValidity} jours</div>
    </div>
  </div>
  <!-- Customer -->
  <div style="margin-bottom:24px">
    <div style="font-size:10px;font-weight:600;color:#6B7280;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Destinataire</div>
    <div style="font-size:14px;font-weight:700;color:#0D1B2A">${effectiveCustomer}</div>
    ${(useManualCustomer&&qCustomerAddr)?`<div style="font-size:11px;color:#6B7280;margin-top:3px;line-height:1.6">${qCustomerAddr.replace(/\n/g,"<br/>")}</div>`:""}
  </div>
  <!-- Table -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
    <thead>
      <tr style="background:#0D1B2A">
        <th style="padding:8px 10px;text-align:left;color:#fff;font-size:10px;text-transform:uppercase;letter-spacing:.05em;font-weight:600">Part Number</th>
        <th style="padding:8px 10px;text-align:left;color:#fff;font-size:10px;text-transform:uppercase;letter-spacing:.05em;font-weight:600">Description</th>
        <th style="padding:8px 10px;text-align:center;color:#fff;font-size:10px;text-transform:uppercase;letter-spacing:.05em;font-weight:600">Qté</th>
        <th style="padding:8px 10px;text-align:right;color:#fff;font-size:10px;text-transform:uppercase;letter-spacing:.05em;font-weight:600">Prix U. (€)</th>
        <th style="padding:8px 10px;text-align:right;color:#fff;font-size:10px;text-transform:uppercase;letter-spacing:.05em;font-weight:600">Total HT (€)</th>
        <th style="padding:8px 10px;text-align:left;color:#fff;font-size:10px;text-transform:uppercase;letter-spacing:.05em;font-weight:600">Disponibilité</th>
      </tr>
    </thead>
    <tbody>${linesHTML}</tbody>
    <tfoot>
      <tr style="background:#F8FAFC">
        <td colspan="4" style="padding:10px;text-align:right;font-weight:700;font-size:13px">TOTAL HT</td>
        <td style="padding:10px;text-align:right;font-weight:800;font-size:14px;color:#1D4ED8">${fmt(totalHT)} €</td>
        <td></td>
      </tr>
    </tfoot>
  </table>
  ${qNotes?`<div style="background:#F8FAFC;border:1px solid #E5EAF0;border-radius:6px;padding:12px 14px;margin-bottom:20px"><div style="font-size:10px;font-weight:600;color:#6B7280;text-transform:uppercase;margin-bottom:4px">Notes</div><div style="font-size:11px;color:#374151">${qNotes}</div></div>`:""}
  <div style="margin-top:30px;padding-top:16px;border-top:1px solid #E5EAF0;display:flex;justify-content:space-between;font-size:10px;color:#9CA3AF">
    <span>Ce devis est valable ${qValidity} jours à compter de la date d'émission.</span>
    <span>GRUNDFOS — kyao@grundfos.com</span>
  </div>
<div style='position:fixed;top:12px;right:12px;z-index:999;display:flex;gap:8px'>
<button onclick='window.print()' style='background:#1D4ED8;color:#fff;border:none;border-radius:8px;padding:10px 20px;font-size:13px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.3)'>🖨️ Print / PDF</button>
<button onclick='window.close()' style='background:#6B7280;color:#fff;border:none;border-radius:8px;padding:10px 16px;font-size:13px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif'>✕ Close</button>
</div>
<style>@media print{.no-print{display:none!important}}</style>
</body></html>`);
    w.document.close();
  };

  const filteredProducts=products.filter((p:any)=>
    !catSearch||p.pn.toLowerCase().includes(catSearch.toLowerCase())||
    (p.description||"").toLowerCase().includes(catSearch.toLowerCase())
  );

  const TABS=[
    {id:"devis",label:"Nouveau devis",icon:"ti-file-plus"},
    {id:"catalogue",label:"Catalogue",icon:"ti-database"},
    {id:"upload",label:"Importer prix",icon:"ti-upload"},
  ];

  const handleCatEdit=(updated:any)=>{
    const idx=products.findIndex((p:any)=>p.pn===catEditProduct?.pn);
    if(idx>=0){
      const newProducts=[...products];
      newProducts[idx]=updated;
      saveProducts(newProducts);
    }
    setCatEditProduct(null);
  };

  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {catEditProduct&&<CatEditModal product={catEditProduct} onSave={handleCatEdit} onClose={()=>setCatEditProduct(null)}/>}
      {/* Header */}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
        <div>
          <h1 style={{margin:"0 0 4px",fontSize:22,fontWeight:700,color:C.t1}}>Catalogue & Devis</h1>
          <p style={{margin:0,color:C.t3,fontSize:13}}>{products.length} produits · {quotes.length} devis générés</p>
        </div>
      </div>
      {/* Tabs */}
      <div style={{display:"flex",background:"#fff",border:`1px solid ${C.b}`,borderRadius:C.r,overflow:"hidden",alignSelf:"flex-start",boxShadow:C.sh}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id as any)}
            style={{display:"flex",alignItems:"center",gap:7,padding:"9px 18px",border:"none",borderRight:`1px solid ${C.b}`,
              background:tab===t.id?C.blue:"transparent",color:tab===t.id?"#fff":C.t2,
              fontWeight:tab===t.id?700:400,fontSize:12,cursor:"pointer",transition:"all .15s",whiteSpace:"nowrap"}}>
            <i className={`ti ${t.icon}`} style={{fontSize:14}} aria-hidden="true"/>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: NOUVEAU DEVIS ────────────────────────────────────────────── */}
      {tab==="devis"&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {/* Quote header */}
          <div style={{background:"#fff",borderRadius:C.rLg,border:`1px solid ${C.b}`,boxShadow:C.sh,padding:"16px 20px"}}>
            <div style={{fontSize:12,fontWeight:600,color:C.t1,marginBottom:12,display:"flex",alignItems:"center",gap:6}}>
              <i className="ti ti-file-text" style={{fontSize:14,color:C.blue}} aria-hidden="true"/> Informations du devis
            </div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr 1fr",gap:10}}>
              <div>
                <label style={{fontSize:11,color:C.t3,fontWeight:600,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:".05em"}}>Référence</label>
                <input value={qRef} onChange={e=>setQRef(e.target.value)}
                  style={{width:"100%",padding:"8px 10px",border:`1px solid ${C.b}`,borderRadius:C.rSm,fontSize:12,fontFamily:"inherit",boxSizing:"border-box"}}/>
              </div>
              <div style={{gridColumn:"span 1"}}>
                <label style={{fontSize:11,color:C.t3,fontWeight:600,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:".05em"}}>Customer</label>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  <div style={{display:"flex",gap:6}}>
                    <select value={useManualCustomer?"__manual__":qCustomer}
                      onChange={e=>{
                        if(e.target.value==="__manual__"){setUseManualCustomer(true);}
                        else{setUseManualCustomer(false);setQCustomer(e.target.value);}
                      }}
                      style={{flex:1,padding:"8px 10px",border:`1px solid ${useManualCustomer?C.purple:C.b}`,borderRadius:C.rSm,fontSize:12,fontFamily:"inherit",boxSizing:"border-box"}}>
                      <option value="">— Sélectionner —</option>
                      {(clients||[]).map((c:string)=><option key={c} value={c}>{c}</option>)}
                      <option value="__manual__">✏️ Saisir manuellement…</option>
                    </select>
                  </div>
                  {useManualCustomer&&(
                    <div style={{display:"flex",flexDirection:"column",gap:4}}>
                      <input value={qCustomerManual} onChange={e=>setQCustomerManual(e.target.value)}
                        placeholder="Nom du client *"
                        style={{padding:"7px 10px",border:`2px solid ${C.purple}`,borderRadius:C.rSm,fontSize:12,fontFamily:"inherit",boxSizing:"border-box"}}/>
                      <textarea value={qCustomerAddr} onChange={e=>setQCustomerAddr(e.target.value)}
                        placeholder={"Adresse (optionnel)\nBP 123, Abidjan\nCôte d'Ivoire"} rows={3}
                        style={{padding:"7px 10px",border:`1px solid ${C.b}`,borderRadius:C.rSm,fontSize:11,fontFamily:"inherit",resize:"none",boxSizing:"border-box"}}/>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label style={{fontSize:11,color:C.t3,fontWeight:600,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:".05em"}}>Date</label>
                <input type="date" value={qDate} onChange={e=>setQDate(e.target.value)}
                  style={{width:"100%",padding:"8px 10px",border:`1px solid ${C.b}`,borderRadius:C.rSm,fontSize:12,fontFamily:"inherit",boxSizing:"border-box"}}/>
              </div>
              <div>
                <label style={{fontSize:11,color:C.t3,fontWeight:600,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:".05em"}}>Validité (jours)</label>
                <select value={qValidity} onChange={e=>setQValidity(e.target.value)}
                  style={{width:"100%",padding:"8px 10px",border:`1px solid ${C.b}`,borderRadius:C.rSm,fontSize:12,fontFamily:"inherit",boxSizing:"border-box"}}>
                  {["15","30","45","60","90"].map(v=><option key={v} value={v}>{v} jours</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Quote lines */}
          <div style={{background:"#fff",borderRadius:C.rLg,border:`1px solid ${C.b}`,boxShadow:C.sh,overflow:"hidden"}}>
            <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.b}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontWeight:600,fontSize:13,color:C.t1}}>Lignes du devis</span>
              <button onClick={addLine} style={{display:"flex",alignItems:"center",gap:5,background:C.blueL,color:C.blueDk,border:"none",borderRadius:5,padding:"6px 12px",fontSize:11,fontWeight:600,cursor:"pointer"}}>
                <i className="ti ti-plus" style={{fontSize:13}} aria-hidden="true"/> Ajouter une ligne
              </button>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:800}}>
                <thead>
                  <tr style={{background:"#F8FAFC",borderBottom:`1px solid ${C.b}`}}>
                    {["Part Number","Description","Qté","Prix unitaire (€)","Disponibilité","Total",""].map((h,i)=>(
                      <th key={i} style={{padding:"8px 10px",textAlign:i===2||i===5?"center":i===3?"right":"left",color:C.t3,fontWeight:600,fontSize:10,textTransform:"uppercase",letterSpacing:".05em",whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {qLines.map((line:any,idx:number)=>(
                    <tr key={idx} style={{borderBottom:`1px solid ${C.b}`}}>
                      <td style={{padding:"8px 8px",verticalAlign:"top"}}>
                        <input value={line.pn}
                          onChange={e=>{
                            lookupPN(idx,e.target.value);
                            const sugg=products.filter((p:any)=>p.pn.toLowerCase().includes(e.target.value.toLowerCase())&&e.target.value.length>=2).slice(0,8);
                            openDropdown(e,"pn",idx,sugg);
                          }}
                          onBlur={()=>setTimeout(closeDropdown,150)}
                          placeholder="ex: 96896506"
                          style={{width:"100%",padding:"6px 8px",border:`1px solid ${line.priceOptions?.length>0?C.green:C.b}`,borderRadius:5,fontSize:12,fontFamily:"inherit",boxSizing:"border-box"}}/>
                      </td>
                      <td style={{padding:"8px 8px",verticalAlign:"top"}}>
                        <input value={line.desc}
                          onChange={e=>{
                            const v=e.target.value;
                            updateLine(idx,"desc",v);
                            setTimeout(()=>{
                              const results=searchByDesc(v);
                              if(results.length>0)openDropdown(e,"desc",idx,results);
                            },0);
                          }}
                          onBlur={()=>setTimeout(closeDropdown,150)}
                          placeholder="Recherche par description…"
                          style={{width:"100%",padding:"6px 8px",
                            border:`1px solid ${line.desc&&line.pn?C.green:line.desc?C.blue:C.b}`,
                            borderRadius:5,fontSize:12,fontFamily:"inherit",boxSizing:"border-box"}}/>
                      </td>
                      <td style={{padding:"8px 8px",verticalAlign:"top",textAlign:"center"}}>
                        <input type="text" inputMode="numeric"
                          value={line.qty}
                          onChange={e=>{
                            const v=e.target.value.replace(/[^0-9]/g,"");
                            updateLine(idx,"qty",v);
                          }}
                          onBlur={e=>{
                            const n=parseInt(e.target.value)||1;
                            updateLine(idx,"qty",n);
                          }}
                          style={{width:60,padding:"6px 8px",border:`1px solid ${C.b}`,borderRadius:5,fontSize:12,fontFamily:"inherit",textAlign:"center"}}/>
                      </td>
                      <td style={{padding:"8px 8px",verticalAlign:"top"}}>
                        {/* Price options from catalogue */}
                        {line.priceOptions?.length>0?(
                          <div style={{display:"flex",flexDirection:"column",gap:4}}>
                            {line.priceOptions.map((opt:any,pi:number)=>(
                              <label key={pi} style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",padding:"4px 6px",borderRadius:4,background:line.selectedPriceIdx===pi?C.blueL:"transparent",border:`1px solid ${line.selectedPriceIdx===pi?C.blue:C.b}`}}>
                                <input type="radio" name={`price-${idx}`} checked={line.selectedPriceIdx===pi} onChange={()=>selectPrice(idx,pi)} style={{accentColor:C.blue}}/>
                                <div style={{flex:1,minWidth:0}}>
                                  <div style={{fontWeight:700,color:C.t1,fontSize:12}}>{fmt(opt.price)} €</div>
                                  <div style={{fontSize:10,color:C.t3}}>{opt.date} {opt.customer&&`· ${opt.customer}`} · {opt.source}</div>
                                </div>
                              </label>
                            ))}
                            <input type="number" value={line.unitPrice} onChange={e=>updateLine(idx,"unitPrice",+e.target.value)}
                              placeholder="Ou saisir manuellement"
                              style={{padding:"5px 8px",border:`1px solid ${C.b}`,borderRadius:5,fontSize:11,fontFamily:"inherit",marginTop:2}}/>
                          </div>
                        ):(
                          <input type="number" value={line.unitPrice} onChange={e=>updateLine(idx,"unitPrice",+e.target.value)}
                            placeholder="Prix €"
                            style={{width:"100%",padding:"6px 8px",border:`1px solid ${C.b}`,borderRadius:5,fontSize:12,fontFamily:"inherit",boxSizing:"border-box"}}/>
                        )}
                      </td>
                      <td style={{padding:"8px 8px",verticalAlign:"top"}}>
                        <select value={line.avail} onChange={e=>updateLine(idx,"avail",e.target.value)}
                          style={{width:"100%",padding:"6px 8px",border:`2px solid ${!line.avail?C.red:C.b}`,borderRadius:5,fontSize:11,fontFamily:"inherit",color:line.avail?C.t1:C.red,background:line.avail?"#fff":"#FFF5F5"}}>
                          <option value="" disabled style={{color:C.t3}}>…sélectionner…</option>
                          {AVAIL_OPTIONS.map(a=><option key={a} value={a}>{a}</option>)}
                        </select>
                        {!line.avail&&<div style={{fontSize:9,color:C.red,marginTop:2,fontWeight:600}}>Délai requis</div>}
                      </td>
                      <td style={{padding:"8px 8px",verticalAlign:"top",textAlign:"right",fontWeight:700,color:C.blue,whiteSpace:"nowrap"}}>
                        {fmt((+line.qty||0)*(+line.unitPrice||0))} €
                      </td>
                      <td style={{padding:"8px 8px",verticalAlign:"top"}}>
                        {qLines.length>1&&<button onClick={()=>removeLine(idx)} style={{background:C.redL,color:C.redDk,border:"none",borderRadius:4,width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                          <i className="ti ti-trash" style={{fontSize:12}} aria-hidden="true"/>
                        </button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{background:C.blueL,borderTop:`2px solid ${C.blue}30`}}>
                    <td colSpan={5} style={{padding:"10px 10px",textAlign:"right",fontWeight:700,color:C.blueDk}}>TOTAL HT</td>
                    <td style={{padding:"10px 10px",textAlign:"right",fontWeight:800,color:C.blueDk,fontSize:14}}>{fmt(totalHT)} €</td>
                    <td/>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Global fixed dropdown portal */}
          {dropdownPos&&dropdownItems.length>0&&(
            <div style={{
              position:"fixed",top:dropdownPos.top,left:dropdownPos.left,
              width:Math.min(dropdownPos.width,500),maxWidth:"90vw",
              background:"#fff",border:`1px solid ${dropdownType==="pn"?C.blue:C.blue}`,
              borderRadius:8,boxShadow:"0 8px 30px rgba(0,0,0,.18)",
              zIndex:9999,maxHeight:280,overflowY:"auto"
            }}>
              <div style={{padding:"6px 12px",fontSize:10,color:C.t3,fontWeight:700,
                borderBottom:`1px solid ${C.b}`,background:"#F8FAFC",
                textTransform:"uppercase",letterSpacing:".06em",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span>{dropdownItems.length} résultat{dropdownItems.length>1?"s":""} — {dropdownType==="pn"?"Part Number":"Description"}</span>
                <button onClick={closeDropdown} style={{background:"transparent",border:"none",color:C.t3,cursor:"pointer",fontSize:14,lineHeight:1}}>✕</button>
              </div>
              {dropdownItems.map((p:any,di:number)=>(
                <button key={di}
                  onMouseDown={e=>{
                    e.preventDefault();
                    if(dropdownType==="pn") lookupPN(dropdownLineIdx,p.pn);
                    else selectFromDesc(dropdownLineIdx,p);
                    closeDropdown();
                  }}
                  style={{display:"flex",width:"100%",padding:"9px 12px",border:"none",
                    background:"transparent",textAlign:"left",cursor:"pointer",
                    borderBottom:`1px solid ${C.b}`,gap:12,alignItems:"center"}}
                  onMouseEnter={(e:any)=>e.currentTarget.style.background=C.blueL}
                  onMouseLeave={(e:any)=>e.currentTarget.style.background="transparent"}>
                  <div style={{flexShrink:0,minWidth:90}}>
                    <div style={{fontWeight:700,color:C.blue,fontFamily:"monospace",fontSize:12}}>{p.pn}</div>
                    {(p.prices||[]).length>0&&(
                      <div style={{fontSize:11,color:C.greenDk,fontWeight:600,marginTop:2}}>
                        {fmt(p.prices[p.prices.length-1]?.price||0)} €
                      </div>
                    )}
                  </div>
                  <div style={{flex:1,fontSize:11,color:C.t1,lineHeight:1.4,overflow:"hidden",
                    display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>
                    {p.description||"—"}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Notes + generate */}
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"2fr 1fr",gap:14}}>
            <div style={{background:"#fff",borderRadius:C.rLg,border:`1px solid ${C.b}`,boxShadow:C.sh,padding:"14px 18px"}}>
              <label style={{fontSize:11,color:C.t3,fontWeight:600,display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:".05em"}}>Notes / Conditions</label>
              <textarea value={qNotes} onChange={e=>setQNotes(e.target.value)} rows={3}
                placeholder="Conditions de paiement, remarques…"
                style={{width:"100%",padding:"8px 10px",border:`1px solid ${C.b}`,borderRadius:C.rSm,fontSize:12,fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}/>
            </div>
            <div style={{background:"#fff",borderRadius:C.rLg,border:`1px solid ${C.b}`,boxShadow:C.sh,padding:"14px 18px",display:"flex",flexDirection:"column",gap:10,justifyContent:"center"}}>
              <button onClick={generateQuote}
                style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,background:`linear-gradient(135deg,#E2051B,#B91C1C)`,color:"#fff",border:"none",borderRadius:C.r,padding:"12px",fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 15px rgba(226,5,27,.35)"}}>
                <i className="ti ti-printer" style={{fontSize:16}} aria-hidden="true"/>
                Générer le devis PDF
              </button>
              <button onClick={generateDraftQuote}
                style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,background:"#F0FDF4",color:C.greenDk,border:`1px solid ${C.green}40`,borderRadius:C.r,padding:"10px",fontSize:12,fontWeight:600,cursor:"pointer"}}>
                <i className="ti ti-file-text" style={{fontSize:14}} aria-hidden="true"/>
                Draft / Sans en-tête
              </button>
              <button onClick={generateDraftExcel}
                style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,background:"#F0FFF4",color:"#15803D",border:`1px solid #16A34A40`,borderRadius:C.r,padding:"10px",fontSize:12,fontWeight:600,cursor:"pointer"}}>
                <i className="ti ti-file-spreadsheet" style={{fontSize:14}} aria-hidden="true"/>
                Exporter en Excel (.xls)
              </button>
              <button onClick={()=>{setQLines([{pn:"",desc:"",qty:1,unitPrice:0,avail:"",priceOptions:[],selectedPriceIdx:-1}]);setQCustomer("");setQNotes("");setQRef(`QT-${new Date().getFullYear()}-${String(Math.floor(Math.random()*900)+100)}`);}}
                style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,background:"#F1F5F9",color:C.t3,border:"none",borderRadius:C.r,padding:"8px",fontSize:12,cursor:"pointer"}}>
                <i className="ti ti-refresh" style={{fontSize:13}} aria-hidden="true"/> Nouveau devis
              </button>
            </div>
          </div>

          {/* Quote history */}
          {quotes.length>0&&(
            <div style={{background:"#fff",borderRadius:C.rLg,border:`1px solid ${C.b}`,boxShadow:C.sh,overflow:"hidden"}}>
              <div style={{padding:"12px 18px",borderBottom:`1px solid ${C.b}`,fontSize:12,fontWeight:600,color:C.t1}}>Devis récents ({quotes.length})</div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                  <thead><tr style={{background:"#F8FAFC"}}>
                    {["Référence","Customer","Date","Lignes","Total HT"].map(h=><th key={h} style={{padding:"7px 12px",textAlign:"left",color:C.t3,fontWeight:600,fontSize:10,textTransform:"uppercase"}}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {quotes.slice(0,8).map((q:any,i:number)=>(
                      <tr key={i} style={{borderBottom:`1px solid ${C.b}`}}>
                        <td style={{padding:"7px 12px",fontWeight:700,color:C.blue}}>{q.number}</td>
                        <td style={{padding:"7px 12px"}}>{q.client}</td>
                        <td style={{padding:"7px 12px",color:C.t3}}>{fmtD(q.date)}</td>
                        <td style={{padding:"7px 12px",color:C.t3,textAlign:"center"}}>{q.lines?.length||0}</td>
                        <td style={{padding:"7px 12px",fontWeight:700,color:C.teal}}>{fmt(q.totalHT)} €</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: CATALOGUE ────────────────────────────────────────────────── */}
      {tab==="catalogue"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:200,position:"relative"}}>
              <i className="ti ti-search" style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:14,color:C.t3}} aria-hidden="true"/>
              <input value={catSearch} onChange={e=>setCatSearch(e.target.value)} placeholder="Rechercher un PN ou description…"
                style={{width:"100%",padding:"8px 10px 8px 32px",border:`1px solid ${C.b}`,borderRadius:C.r,fontSize:12,fontFamily:"inherit",boxSizing:"border-box"}}/>
            </div>
            <span style={{fontSize:12,color:C.t3}}>{filteredProducts.length} produits</span>
            {products.filter((p:any)=>!p.description||p.description.trim()==="").length>0&&(
              <span style={{fontSize:11,color:C.amberDk,background:C.amberL,padding:"4px 10px",borderRadius:99,fontWeight:600}}>
                ⚠️ {products.filter((p:any)=>!p.description||p.description.trim()==="").length} sans description
              </span>
            )}
            {/* Sync status */}
            <div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:99,fontSize:11,fontWeight:600,
              background:syncStatus==="ok"?C.greenL:syncStatus==="error"?C.redL:syncStatus==="syncing"?C.blueL:"#F1F5F9",
              color:syncStatus==="ok"?C.greenDk:syncStatus==="error"?C.redDk:syncStatus==="syncing"?C.blueDk:C.t3}}>
              <i className={`ti ${syncStatus==="ok"?"ti-cloud-check":syncStatus==="error"?"ti-cloud-exclamation":syncStatus==="syncing"?"ti-loader-2 rotating":"ti-cloud"}`}
                style={{fontSize:13}} aria-hidden="true"/>
              <span style={{maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{syncMsg||"En attente"}</span>
            </div>
            <button onClick={forceSync} title="Forcer la synchronisation cloud"
              style={{background:C.blueL,color:C.blueDk,border:"none",borderRadius:5,padding:"6px 10px",fontSize:11,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
              <i className="ti ti-refresh" style={{fontSize:13}} aria-hidden="true"/> Sync
            </button>
            <button onClick={async()=>{if(window.confirm("Supprimer tout le catalogue ?"))await saveProducts([]);}}
              style={{background:C.redL,color:C.redDk,border:"none",borderRadius:5,padding:"6px 10px",fontSize:11,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
              <i className="ti ti-trash" style={{fontSize:12}} aria-hidden="true"/> Vider
            </button>
          </div>
          <div style={{background:"#fff",borderRadius:C.rLg,border:`1px solid ${C.b}`,boxShadow:C.sh,overflow:"hidden"}}>
            {loading?<div style={{padding:32,textAlign:"center",color:C.t3}}>Chargement…</div>:
            filteredProducts.length===0?<div style={{padding:32,textAlign:"center",color:C.t3}}>Aucun produit — importez des prix depuis l'onglet "Importer prix"</div>:(
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:600}}>
                  <thead><tr style={{background:"#0D1B2A"}}>
                    {["Part Number","Description","Prix disponibles","Dernière mise à jour","Actions"].map((h,i)=>(
                      <th key={h} style={{padding:"8px 12px",textAlign:"left",color:"#fff",fontWeight:600,fontSize:10,textTransform:"uppercase",letterSpacing:".05em"}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {filteredProducts.map((p:any,i:number)=>(
                      <tr key={p.id||i} style={{borderBottom:`1px solid ${C.b}`,background:i%2===0?"#fff":"#FAFBFD"}}>
                        <td style={{padding:"8px 12px",fontWeight:700,color:C.blue,fontFamily:"monospace"}}>{p.pn}</td>
                        <td style={{padding:"8px 12px",color:C.t1,maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.description||"—"}</td>
                        <td style={{padding:"8px 12px"}}>
                          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                            {(p.prices||[]).slice(0,3).map((pr:any,j:number)=>(
                              <span key={j} style={{background:C.blueL,color:C.blueDk,borderRadius:4,padding:"2px 7px",fontSize:10,fontWeight:600,whiteSpace:"nowrap"}}>
                                {fmt(pr.price)} € <span style={{opacity:.6,fontWeight:400}}>· {pr.date}</span>
                              </span>
                            ))}
                            {(p.prices||[]).length>3&&<span style={{color:C.t3,fontSize:10}}>+{p.prices.length-3}</span>}
                            {(!p.prices||p.prices.length===0)&&<span style={{color:C.t3,fontSize:10}}>Aucun prix</span>}
                          </div>
                        </td>
                        <td style={{padding:"8px 12px",color:C.t3}}>{p.lastUpdated||"—"}</td>
                        <td style={{padding:"8px 6px",whiteSpace:"nowrap"}}>
                          <div style={{display:"flex",gap:4}}>
                            <button onClick={()=>setCatEditProduct(p)} title="Modifier"
                              style={{background:C.blueL,color:C.blueDk,border:"none",borderRadius:5,width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                              <i className="ti ti-edit" style={{fontSize:12}} aria-hidden="true"/>
                            </button>
                            <button onClick={()=>{if(window.confirm(`Supprimer ${p.pn} du catalogue ?`)){saveProducts(products.filter((_:any,j:number)=>j!==i));}}}
                              title="Supprimer"
                              style={{background:C.redL,color:C.redDk,border:"none",borderRadius:5,width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                              <i className="ti ti-trash" style={{fontSize:12}} aria-hidden="true"/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: IMPORT ───────────────────────────────────────────────────── */}
      {tab==="upload"&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {/* Manual entry section */}
          <ManualProductEntry products={products} saveProducts={saveProducts}/>

          <div style={{background:"#fff",borderRadius:C.rLg,border:`1px solid ${C.b}`,boxShadow:C.sh,padding:"20px"}}>
            <div style={{fontSize:13,fontWeight:600,color:C.t1,marginBottom:6}}>Importer une liste de prix Excel</div>
            <div style={{fontSize:12,color:C.t3,marginBottom:16,lineHeight:1.6}}>
              Formats acceptés : <strong>.xlsx</strong>, <strong>.xls</strong>, <strong>.csv</strong><br/>
              Le fichier doit contenir une ligne d'en-tête avec au minimum une colonne <strong>Part Number</strong> et une colonne <strong>Prix</strong>.<br/>
              Les colonnes Customer, Description, Qty, Availability sont détectées automatiquement.
            </div>
            <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" multiple onChange={handleMultiFile} style={{display:"none"}}/>
              <button onClick={()=>fileRef.current?.click()} disabled={uploading}
                style={{display:"flex",alignItems:"center",gap:8,background:C.blue,color:"#fff",border:"none",borderRadius:C.r,padding:"10px 20px",fontSize:13,fontWeight:600,cursor:uploading?"not-allowed":"pointer",opacity:uploading?.7:1}}>
                <i className="ti ti-upload" style={{fontSize:15}} aria-hidden="true"/>
                {uploading?uploadMsg.slice(0,30)+"…":"Sélectionner un ou plusieurs fichiers"}
              </button>
              {uploadMsg&&<span style={{fontSize:12,color:uploadMsg.startsWith("✓")?C.greenDk:uploadMsg.includes("Erreur")?C.redDk:C.amberDk,fontWeight:500}}>{uploadMsg}</span>}
              {multiFiles.length>1&&processingIdx>=0&&(
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                  {multiFiles.map((f:File,i:number)=>(
                    <span key={i} style={{fontSize:10,padding:"2px 8px",borderRadius:99,fontWeight:600,
                      background:i<processingIdx?C.greenL:i===processingIdx?C.blueL:"#F1F5F9",
                      color:i<processingIdx?C.greenDk:i===processingIdx?C.blueDk:C.t3}}>
                      {i<processingIdx?"✓ ":i===processingIdx?"⟳ ":""}{f.name.slice(0,20)}{f.name.length>20?"…":""}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Preview & column mapping */}
          {previewRows.length>0&&(
            <div style={{background:"#fff",borderRadius:C.rLg,border:`1px solid ${C.b}`,boxShadow:C.sh,padding:"16px 20px"}}>
              <div style={{fontSize:13,fontWeight:600,color:C.t1,marginBottom:12}}>Aperçu — {pendingFile}</div>
              {/* Visual column mapping - click on a column header to assign it */}
              <div style={{fontSize:12,color:C.t2,marginBottom:10,lineHeight:1.6}}>
                👇 <strong>Clique sur l'en-tête d'une colonne</strong> pour lui assigner un rôle.
                Les colonnes en couleur sont déjà mappées.
              </div>
              {/* Legend */}
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
                {[
                  {key:"pn",label:"Part Number *",color:C.blue,bg:C.blueL},
                  {key:"desc",label:"Description",color:"#7C3AED",bg:"#EDE9FE"},
                  {key:"price",label:"Prix",color:C.greenDk,bg:C.greenL},
                  {key:"qty",label:"Quantité",color:C.amberDk,bg:C.amberL},
                  {key:"customer",label:"Customer",color:"#0D9488",bg:"#CCFBF1"},
                  {key:"avail",label:"Availability",color:"#BE185D",bg:"#FCE7F3"},
                ].map(({key,label,color,bg})=>(
                  <div key={key} style={{display:"flex",alignItems:"center",gap:5,padding:"3px 8px",borderRadius:99,background:colMap[key]>=0?bg:"#F1F5F9",border:`1px solid ${colMap[key]>=0?color:"#D1D5DB"}`}}>
                    <span style={{width:8,height:8,borderRadius:99,background:colMap[key]>=0?color:"#D1D5DB",flexShrink:0}}/>
                    <span style={{fontSize:10,fontWeight:600,color:colMap[key]>=0?color:"#9CA3AF"}}>
                      {label} {colMap[key]>=0?`→ Col.${colMap[key]+1}`:"(non assigné)"}
                    </span>
                    {colMap[key]>=0&&<button onClick={()=>setColMap((m:any)=>({...m,[key]:-1}))} style={{background:"transparent",border:"none",color,cursor:"pointer",padding:0,fontSize:11,lineHeight:1}}>✕</button>}
                  </div>
                ))}
              </div>
              {/* Interactive preview table */}
              <div style={{overflowX:"auto",marginBottom:14,border:`1px solid ${C.b}`,borderRadius:C.r,overflow:"hidden"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                  <thead>
                    <tr>
                      {previewRows[0]?.map((h:any,i:number)=>{
                        const roleColors:any={pn:{c:C.blue,bg:C.blueL},desc:{c:"#7C3AED",bg:"#EDE9FE"},price:{c:C.greenDk,bg:C.greenL},qty:{c:C.amberDk,bg:C.amberL},customer:{c:"#0D9488",bg:"#CCFBF1"},avail:{c:"#BE185D",bg:"#FCE7F3"}};
                        const role=Object.keys(colMap).find((k:string)=>colMap[k]===i);
                        const rc=role?roleColors[role]:null;
                        const ROLES=[{key:"pn",label:"PN *"},{key:"desc",label:"Desc"},{key:"price",label:"Prix"},{key:"qty",label:"Qté"},{key:"customer",label:"Customer"},{key:"avail",label:"Dispo"}];
                        return(
                          <th key={i} style={{padding:0,border:`1px solid ${C.b}`,background:rc?rc.bg:"#F8FAFC",minWidth:80,position:"relative"}}>
                            <div style={{padding:"6px 8px",display:"flex",flexDirection:"column",gap:3}}>
                              <span style={{fontSize:10,fontWeight:700,color:rc?rc.c:C.t1}}>{String(h||`Col ${i+1}`)}</span>
                              {/* Role selector */}
                              <select value={role||""} onChange={e=>{
                                const newKey=e.target.value;
                                // Remove from previous
                                const updated:any={...colMap};
                                if(role)updated[role]=-1;
                                if(newKey)updated[newKey]=i;
                                setColMap(updated);
                              }} style={{fontSize:9,padding:"2px 4px",border:`1px solid ${rc?rc.c:C.b}`,borderRadius:3,background:"#fff",color:rc?rc.c:C.t3,fontWeight:rc?600:400,cursor:"pointer"}}>
                                <option value="">— Assigner —</option>
                                {ROLES.map(r=><option key={r.key} value={r.key} disabled={colMap[r.key]>=0&&colMap[r.key]!==i}>{r.label}</option>)}
                              </select>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.slice(1,5).map((row:any,ri:number)=>(
                      <tr key={ri} style={{borderBottom:`1px solid ${C.b}`,background:ri%2===0?"#fff":"#FAFBFD"}}>
                        {row.map((cell:any,ci:number)=>{
                          const roleColors:any={pn:{c:C.blue,bg:C.blueL},desc:{c:"#7C3AED",bg:"#EDE9FE"},price:{c:C.greenDk,bg:C.greenL},qty:{c:C.amberDk,bg:C.amberL},customer:{c:"#0D9488",bg:"#CCFBF1"},avail:{c:"#BE185D",bg:"#FCE7F3"}};
                          const role=Object.keys(colMap).find((k:string)=>colMap[k]===ci);
                          const rc=role?roleColors[role]:null;
                          return(
                            <td key={ci} style={{padding:"5px 8px",color:rc?rc.c:C.t3,fontWeight:rc?600:400,background:rc?`${rc.bg}60`:"transparent",fontSize:11}}>
                              {String(cell||"")}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={confirmImport} disabled={uploading||colMap.pn<0}
                style={{display:"flex",alignItems:"center",gap:8,background:colMap.pn>=0?C.green:"#D1D5DB",color:"#fff",border:"none",borderRadius:C.r,padding:"10px 20px",fontSize:13,fontWeight:600,cursor:colMap.pn>=0?"pointer":"not-allowed"}}>
                <i className="ti ti-database-import" style={{fontSize:15}} aria-hidden="true"/>
                Confirmer l'import
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── DOCUMENTS PAGE ──────────────────────────────────────────────────────────
const DOCS_KEY="ordertrack-docs";
const DOCS_LS="ordertrack_docs_cache";

const saveDocsCloud=async(docs:any[]):Promise<boolean>=>{
  const K="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4eHJ4bnl4Zm1nY2R6eGNpZ2R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMTg5MzIsImV4cCI6MjA5NTc5NDkzMn0.wF2mt8BK1KGk-VyK4zZQvFGJCxCp8UGDPdgT_8DHc6o";
  const B="https://vxxrxnyxfmgcdzxcigdw.supabase.co";
  try{
    // Step 1: Try PATCH on existing row
    const patch=await fetch(B+"/rest/v1/ordertrack_data?apikey="+K+"&user_key=eq."+DOCS_KEY,{
      method:"PATCH",
      headers:{"Content-Type":"application/json","apikey":K,"Authorization":"Bearer "+K,"Prefer":"count=exact,return=minimal"},
      body:JSON.stringify({payload:{docs,ts:new Date().toISOString()}})
    });
    // Check if PATCH actually updated a row via Content-Range header
    const count=patch.headers.get("Content-Range"); // e.g. "*/1" means 1 row
    const updated=count&&!count.includes("*/0");
    if(patch.ok&&updated){
      console.log("[Docs] PATCH OK — updated existing row");
      return true;
    }
    // Step 2: INSERT (row doesn't exist yet)
    const post=await fetch(B+"/rest/v1/ordertrack_data?apikey="+K,{
      method:"POST",
      headers:{"Content-Type":"application/json","apikey":K,"Authorization":"Bearer "+K,"Prefer":"return=minimal"},
      body:JSON.stringify({user_key:DOCS_KEY,payload:{docs,ts:new Date().toISOString()}})
    });
    if(post.ok||post.status===201||post.status===204){
      console.log("[Docs] POST INSERT OK");
      return true;
    }
    const err=await post.text();
    console.warn("[Docs] POST failed:",post.status,err);
    return false;
  }catch(e){console.warn("[Docs] Exception:",e);return false;}
};
const saveDocs=async(docs:any[],setSyncMsgFn?:any)=>{
  const ts=new Date().toISOString();
  try{localStorage.setItem(DOCS_LS,JSON.stringify(docs));localStorage.setItem(DOCS_LS+"_ts",ts);}catch{}
  const ok=await saveDocsCloud(docs);
  if(setSyncMsgFn){
    setSyncMsgFn(ok?`✓ ${docs.length} document${docs.length>1?"s":""} sauvegardé${docs.length>1?"s":""}  dans le cloud`:"⚠️ Sauvegarde locale OK — cloud non synchronisé");
    setTimeout(()=>setSyncMsgFn(""),4000);
  }
  return ok;
};
const loadDocsLocal=():any[]|null=>{
  try{const d=localStorage.getItem(DOCS_LS);return d?JSON.parse(d):null;}catch{return null;}
};

function DocumentsPage({isMobile}:any){
  const[docs,setDocs]=useState<any[]>(()=>loadDocsLocal()||[]);
  const[search,setSearch]=useState("");
  const[uploading,setUploading]=useState(false);
  const[uploadMsg,setUploadMsg]=useState("");
  const[catFilter,setCatFilter]=useState("all");
  const[dragOver,setDragOver]=useState(false);
  const[syncMsg,setSyncMsg]=useState("");
  const[syncing,setSyncing]=useState(false);
  const fileRef=useRef<HTMLInputElement>(null);

  const loadFromCloud=async(silent=false)=>{
    const K="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4eHJ4bnl4Zm1nY2R6eGNpZ2R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMTg5MzIsImV4cCI6MjA5NTc5NDkzMn0.wF2mt8BK1KGk-VyK4zZQvFGJCxCp8UGDPdgT_8DHc6o";
    const B="https://vxxrxnyxfmgcdzxcigdw.supabase.co";
    if(!silent)setSyncing(true);
    try{
      const r=await fetch(B+"/rest/v1/ordertrack_data?apikey="+K+"&user_key=eq."+DOCS_KEY+"&select=payload,updated_at&limit=1",
        {headers:{"apikey":K,"Authorization":"Bearer "+K,"Prefer":"return=representation"}});
      console.log("[Docs load] status:",r.status);
      if(!r.ok){setSyncMsg("⚠️ Erreur connexion Supabase: "+r.status);setSyncing(false);return;}
      const rows=await r.json();
      console.log("[Docs load] rows:",rows?.length,"payload keys:",Object.keys(rows?.[0]?.payload||{}));
      const cloudDocs=rows?.[0]?.payload?.docs||[];
      console.log("[Docs load] cloudDocs count:",cloudDocs.length);
      if(cloudDocs.length>0){
        setDocs(cloudDocs);
        try{localStorage.setItem(DOCS_LS,JSON.stringify(cloudDocs));}catch{}
        setSyncMsg("✓ "+cloudDocs.length+" document"+(cloudDocs.length>1?"s":"")+" chargé"+(cloudDocs.length>1?"s":"")+" depuis le cloud");
      } else {
        const localDocs=loadDocsLocal()||[];
        if(localDocs.length>0){
          // Push local to cloud
          await saveDocsCloud(localDocs);
          setSyncMsg("✓ "+localDocs.length+" document"+(localDocs.length>1?"s":"")+" envoyé"+(localDocs.length>1?"s":"")+" vers le cloud");
        } else {
          setSyncMsg("Cloud vide — aucun document synchronisé");
        }
      }
    }catch(e:any){
      console.warn("[Docs load] error:",e);
      setSyncMsg("⚠️ Erreur: "+e.message);
    }
    setSyncing(false);
  };

  useEffect(()=>{loadFromCloud(true);},[]);

  const CATEGORIES=[
    {id:"all",label:"Tous",icon:"ti-files"},
    {id:"pdf",label:"PDF",icon:"ti-file-type-pdf"},
    {id:"excel",label:"Excel",icon:"ti-file-type-xls"},
    {id:"word",label:"Word",icon:"ti-file-type-doc"},
    {id:"other",label:"Autres",icon:"ti-file"},
  ];

  const getCategory=(type:string,name:string)=>{
    if(type?.includes("pdf")||name?.endsWith(".pdf"))return "pdf";
    if(type?.includes("excel")||type?.includes("spreadsheet")||name?.match(/\.(xlsx?|csv)$/i))return "excel";
    if(type?.includes("word")||name?.match(/\.(docx?|odt)$/i))return "word";
    return "other";
  };

  const getCatStyle=(cat:string)=>{
    if(cat==="pdf")return{icon:"ti-file-type-pdf",color:"#DC2626",bg:"#FEE2E2"};
    if(cat==="excel")return{icon:"ti-file-type-xls",color:"#059669",bg:"#D1FAE5"};
    if(cat==="word")return{icon:"ti-file-type-doc",color:"#2563EB",bg:"#DBEAFE"};
    return{icon:"ti-file",color:"#7C3AED",bg:"#EDE9FE"};
  };

  const fmtSize=(b:number)=>b>1024*1024?`${(b/1024/1024).toFixed(1)} Mo`:b>1024?`${Math.round(b/1024)} Ko`:`${b} o`;

  const uploadFile=async(file:File)=>{
    const ext=file.name.split(".").pop()?.toLowerCase();
    const path=`documents/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;
    const K="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4eHJ4bnl4Zm1nY2R6eGNpZ2R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMTg5MzIsImV4cCI6MjA5NTc5NDkzMn0.wF2mt8BK1KGk-VyK4zZQvFGJCxCp8UGDPdgT_8DHc6o";
    const res=await fetch(`https://vxxrxnyxfmgcdzxcigdw.supabase.co/storage/v1/object/ordertrack-files/${path}`,{
      method:"POST",
      headers:{"apikey":K,"Authorization":"Bearer "+K,"Content-Type":file.type||"application/octet-stream"},
      body:file
    });
    if(!res.ok){const e=await res.text();throw new Error(e);}
    return{
      url:`https://vxxrxnyxfmgcdzxcigdw.supabase.co/storage/v1/object/public/ordertrack-files/${path}`,
      path
    };
  };

  const handleFiles=async(files:FileList|File[])=>{
    const arr=Array.from(files);
    if(!arr.length)return;
    setUploading(true);
    let added=0;
    const newDocs=[...docs];
    for(let i=0;i<arr.length;i++){
      const file=arr[i];
      setUploadMsg(`Upload ${i+1}/${arr.length} : ${file.name}…`);
      try{
        const{url,path}=await uploadFile(file);
        const cat=getCategory(file.type,file.name);
        newDocs.unshift({
          id:Date.now().toString()+Math.random().toString(36).slice(2,5),
          name:file.name,
          size:file.size,
          type:file.type,
          category:cat,
          url,path,
          uploadedAt:new Date().toISOString(),
          tags:[]
        });
        added++;
      }catch(e:any){
        setUploadMsg(`⚠️ Erreur : ${file.name} — ${e.message?.slice(0,60)}`);
        await new Promise(r=>setTimeout(r,1500));
      }
    }
    setDocs(newDocs);
    setUploadMsg(`✓ ${added} fichier${added>1?"s":""} ajouté${added>1?"s":""} — synchronisation…`);
    await saveDocs(newDocs,setSyncMsg);
    setUploadMsg(`✓ ${added} fichier${added>1?"s":""} ajouté${added>1?"s":""}`);
    setUploading(false);
    if(fileRef.current)fileRef.current.value="";
  };

  const deleteDoc=async(doc:any)=>{
    if(!window.confirm(`Supprimer "${doc.name}" ?`))return;
    // Delete from storage
    try{
      const K="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4eHJ4bnl4Zm1nY2R6eGNpZ2R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMTg5MzIsImV4cCI6MjA5NTc5NDkzMn0.wF2mt8BK1KGk-VyK4zZQvFGJCxCp8UGDPdgT_8DHc6o";
      await fetch(`https://vxxrxnyxfmgcdzxcigdw.supabase.co/storage/v1/object/ordertrack-files/${doc.path}`,{
        method:"DELETE",headers:{"apikey":K,"Authorization":"Bearer "+K}
      });
    }catch{}
    const updated=docs.filter((d:any)=>d.id!==doc.id);
    setDocs(updated);
    await saveDocs(updated,setSyncMsg);
  };

  const filtered=docs.filter((d:any)=>{
    const matchCat=catFilter==="all"||d.category===catFilter;
    const matchSearch=!search||d.name.toLowerCase().includes(search.toLowerCase());
    return matchCat&&matchSearch;
  });

  // Stats
  const totalSize=docs.reduce((s:number,d:any)=>s+(d.size||0),0);
  const catCounts:Record<string,number>={};
  docs.forEach((d:any)=>{catCounts[d.category]=(catCounts[d.category]||0)+1;});

  // Search mode: show results only when query is active
  const isSearching=search.trim().length>0||catFilter!=="all";

  return(
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <input ref={fileRef} type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.png,.jpg,.jpeg" onChange={e=>handleFiles(e.target.files!)} style={{display:"none"}}/>

      {/* Hero search bar */}
      <div style={{background:`linear-gradient(135deg,#0D1B2A 0%,#1E3A5F 60%,#1D4ED8 100%)`,borderRadius:C.rLg,padding:isMobile?"24px 20px":"36px 40px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",right:0,top:0,bottom:0,width:"40%",background:"rgba(255,255,255,.03)",borderLeft:"1px solid rgba(255,255,255,.06)"}}/>
        <div style={{position:"relative",zIndex:1}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:10}}>
            <div>
              <h1 style={{margin:"0 0 4px",fontSize:isMobile?18:24,fontWeight:800,color:"#fff",letterSpacing:"-.02em"}}>
                <i className="ti ti-files" style={{marginRight:10,fontSize:isMobile?16:20}} aria-hidden="true"/>Bibliothèque de documents
              </h1>
              <p style={{margin:0,color:"rgba(255,255,255,.5)",fontSize:12}}>
                {docs.length} fichier{docs.length>1?"s":""} · {fmtSize(totalSize)}
                {syncMsg&&<span style={{marginLeft:10,color:syncMsg.startsWith("✓")?"#86EFAC":syncMsg.startsWith("⚠")?"#FCA5A5":"#93C5FD"}}>{syncMsg}</span>}
              </p>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>loadFromCloud(false)} disabled={syncing} title="Synchroniser"
                style={{display:"flex",alignItems:"center",gap:5,background:"rgba(255,255,255,.1)",color:"rgba(255,255,255,.8)",
                  border:"1px solid rgba(255,255,255,.15)",borderRadius:C.r,padding:"8px 14px",fontSize:12,fontWeight:600,cursor:"pointer"}}>
                <i className={`ti ti-refresh${syncing?" rotating":""}`} style={{fontSize:13}} aria-hidden="true"/>
                {syncing?"Sync…":"Sync"}
              </button>
              <button onClick={()=>fileRef.current?.click()} disabled={uploading}
                style={{display:"flex",alignItems:"center",gap:7,background:"#fff",color:C.blue,border:"none",
                  borderRadius:C.r,padding:"8px 18px",fontSize:12,fontWeight:700,cursor:"pointer",boxShadow:"0 2px 8px rgba(0,0,0,.2)"}}>
                <i className="ti ti-upload" style={{fontSize:14}} aria-hidden="true"/>
                {uploading?"Envoi…":"Ajouter"}
              </button>
            </div>
          </div>
          {/* Search bar */}
          <div style={{position:"relative"}}>
            <i className="ti ti-search" style={{position:"absolute",left:16,top:"50%",transform:"translateY(-50%)",fontSize:18,color:"rgba(255,255,255,.4)"}} aria-hidden="true"/>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Rechercher un document… (nom, type)"
              style={{width:"100%",padding:"14px 44px",background:"rgba(255,255,255,.1)",
                border:"1px solid rgba(255,255,255,.2)",borderRadius:C.rLg,
                fontSize:14,fontFamily:"inherit",color:"#fff",outline:"none",boxSizing:"border-box",
                backdropFilter:"blur(10px)"}}/>
            {search&&<button onClick={()=>setSearch("")}
              style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",
                background:"rgba(255,255,255,.2)",border:"none",color:"#fff",cursor:"pointer",
                borderRadius:99,width:24,height:24,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>✕</button>}
          </div>
        </div>
      </div>

      {/* Upload feedback */}
      {(uploadMsg||dragOver)&&(
        <div onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)}
          onDrop={e=>{e.preventDefault();setDragOver(false);handleFiles(e.dataTransfer.files);}}
          style={{background:dragOver?C.blueL:uploadMsg.startsWith("✓")?C.greenL:uploadMsg.startsWith("⚠")?C.amberL:C.blueL,
            border:`2px dashed ${dragOver?C.blue:uploadMsg.startsWith("✓")?C.green:C.blue}`,
            color:dragOver?C.blueDk:uploadMsg.startsWith("✓")?C.greenDk:uploadMsg.startsWith("⚠")?C.amberDk:C.blueDk,
            padding:"14px 20px",borderRadius:C.r,fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:10}}>
          <i className={`ti ${dragOver?"ti-upload":uploadMsg.startsWith("✓")?"ti-check":"ti-loader-2 rotating"}`} style={{fontSize:18}} aria-hidden="true"/>
          {dragOver?"Déposez les fichiers ici…":uploadMsg}
        </div>
      )}

      {!isSearching&&!dragOver?(
        <>
          {/* Category cards */}
          <div>
            <div style={{fontSize:11,fontWeight:700,color:C.t3,textTransform:"uppercase",letterSpacing:".08em",marginBottom:12}}>Parcourir par catégorie</div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4,1fr)",gap:10}}>
              {CATEGORIES.filter(c=>c.id!=="all").map(cat=>{
                const cs=getCatStyle(cat.id);
                const count=catCounts[cat.id]||0;
                return(
                  <button key={cat.id} onClick={()=>setCatFilter(cat.id)}
                    onDragOver={e=>{e.preventDefault();setDragOver(true);}}
                    onDrop={e=>{e.preventDefault();setDragOver(false);handleFiles(e.dataTransfer.files);}}
                    style={{background:"#fff",border:`1px solid ${C.b}`,borderRadius:C.rLg,padding:"20px 18px",
                      cursor:"pointer",textAlign:"left",boxShadow:C.sh,transition:"all .15s"}}
                    onMouseEnter={(e:any)=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=C.shMd;}}
                    onMouseLeave={(e:any)=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow=C.sh;}}>
                    <div style={{width:40,height:40,borderRadius:10,background:cs.bg,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:12}}>
                      <i className={`ti ${cs.icon}`} style={{fontSize:20,color:cs.color}} aria-hidden="true"/>
                    </div>
                    <div style={{fontSize:13,fontWeight:700,color:C.t1,marginBottom:3}}>{cat.label}</div>
                    <div style={{fontSize:22,fontWeight:800,color:cs.color}}>{count}</div>
                    <div style={{fontSize:10,color:C.t3,marginTop:2}}>fichier{count>1?"s":""}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recent documents */}
          {docs.length>0&&(
            <div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                <div style={{fontSize:11,fontWeight:700,color:C.t3,textTransform:"uppercase",letterSpacing:".08em"}}>Documents récents</div>
                {docs.length>5&&<button onClick={()=>setCatFilter("all")} style={{fontSize:11,color:C.blue,background:"transparent",border:"none",cursor:"pointer",fontWeight:600}}>Voir tout →</button>}
              </div>
              <div style={{background:"#fff",borderRadius:C.rLg,border:`1px solid ${C.b}`,boxShadow:C.sh,overflow:"hidden"}}>
                {docs.slice(0,5).map((doc:any,i:number)=>{
                  const cs=getCatStyle(doc.category);
                  const date=doc.uploadedAt?new Date(doc.uploadedAt).toLocaleDateString("fr-FR",{day:"numeric",month:"short",year:"numeric"}):"";
                  return(
                    <div key={doc.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",
                      borderBottom:i<Math.min(docs.length-1,4)?`1px solid ${C.b}`:"none",
                      transition:"background .12s"}}
                      onMouseEnter={(e:any)=>e.currentTarget.style.background="#F8FAFC"}
                      onMouseLeave={(e:any)=>e.currentTarget.style.background="#fff"}>
                      <div style={{width:36,height:36,borderRadius:8,background:cs.bg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <i className={`ti ${cs.icon}`} style={{fontSize:18,color:cs.color}} aria-hidden="true"/>
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:600,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{doc.name}</div>
                        <div style={{fontSize:10,color:C.t3,marginTop:2}}>{fmtSize(doc.size||0)} · {date}</div>
                      </div>
                      <div style={{display:"flex",gap:5,flexShrink:0}}>
                        <a href={doc.url} target="_blank" rel="noreferrer"
                          style={{background:C.blueL,color:C.blueDk,borderRadius:5,padding:"5px 10px",fontSize:11,fontWeight:600,textDecoration:"none",display:"flex",alignItems:"center",gap:4}}>
                          <i className="ti ti-external-link" style={{fontSize:12}} aria-hidden="true"/> Ouvrir
                        </a>
                        <button onClick={()=>deleteDoc(doc)}
                          style={{background:C.redL,color:C.redDk,border:"none",borderRadius:5,width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                          <i className="ti ti-trash" style={{fontSize:12}} aria-hidden="true"/>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Drop zone when empty */}
          {docs.length===0&&(
            <div onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)}
              onDrop={e=>{e.preventDefault();setDragOver(false);handleFiles(e.dataTransfer.files);}}
              onClick={()=>fileRef.current?.click()}
              style={{border:`2px dashed ${C.b}`,borderRadius:C.rLg,padding:"48px",textAlign:"center",cursor:"pointer",background:"#FAFBFD"}}>
              <i className="ti ti-cloud-upload" style={{fontSize:40,color:C.t3,display:"block",marginBottom:12}} aria-hidden="true"/>
              <div style={{fontSize:14,fontWeight:600,color:C.t2,marginBottom:4}}>Aucun document — commencez par en ajouter</div>
              <div style={{fontSize:12,color:C.t3}}>Glissez des fichiers ici ou cliquez sur "Ajouter"</div>
            </div>
          )}
        </>
      ):(
        /* Search / filter results */
        <div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,flexWrap:"wrap",gap:8}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              {catFilter!=="all"&&(
                <button onClick={()=>setCatFilter("all")}
                  style={{display:"flex",alignItems:"center",gap:5,background:C.blueL,color:C.blueDk,border:"none",borderRadius:99,padding:"4px 12px",fontSize:11,fontWeight:600,cursor:"pointer"}}>
                  <i className="ti ti-x" style={{fontSize:11}} aria-hidden="true"/> {CATEGORIES.find(c=>c.id===catFilter)?.label}
                </button>
              )}
              <span style={{fontSize:12,color:C.t3}}>{filtered.length} résultat{filtered.length>1?"s":""}</span>
            </div>
            <button onClick={()=>{setSearch("");setCatFilter("all");}}
              style={{fontSize:11,color:C.t3,background:"transparent",border:"none",cursor:"pointer",textDecoration:"underline"}}>
              Effacer les filtres
            </button>
          </div>
          {filtered.length===0?(
            <div style={{background:"#fff",borderRadius:C.rLg,border:`1px solid ${C.b}`,padding:"48px",textAlign:"center"}}>
              <i className="ti ti-search-off" style={{fontSize:36,color:C.t3,display:"block",marginBottom:12}} aria-hidden="true"/>
              <div style={{fontSize:14,fontWeight:600,color:C.t2}}>Aucun document trouvé</div>
              <div style={{fontSize:12,color:C.t3,marginTop:4}}>Essayez un autre mot-clé</div>
            </div>
          ):(
            <div style={{background:"#fff",borderRadius:C.rLg,border:`1px solid ${C.b}`,boxShadow:C.sh,overflow:"hidden"}}>
              {filtered.map((doc:any,i:number)=>{
                const cs=getCatStyle(doc.category);
                const date=doc.uploadedAt?new Date(doc.uploadedAt).toLocaleDateString("fr-FR",{day:"numeric",month:"short",year:"numeric"}):"";
                return(
                  <div key={doc.id} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 16px",
                    borderBottom:i<filtered.length-1?`1px solid ${C.b}`:"none",transition:"background .1s"}}
                    onMouseEnter={(e:any)=>e.currentTarget.style.background="#F8FAFC"}
                    onMouseLeave={(e:any)=>e.currentTarget.style.background="#fff"}>
                    <div style={{width:36,height:36,borderRadius:8,background:cs.bg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <i className={`ti ${cs.icon}`} style={{fontSize:18,color:cs.color}} aria-hidden="true"/>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:600,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{doc.name}</div>
                      <div style={{fontSize:10,color:C.t3,marginTop:2,display:"flex",gap:8}}>
                        <span style={{background:cs.bg,color:cs.color,borderRadius:3,padding:"1px 6px",fontWeight:600,fontSize:9}}>{doc.category?.toUpperCase()}</span>
                        <span>{fmtSize(doc.size||0)}</span>
                        <span>· {date}</span>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:5,flexShrink:0}}>
                      <a href={doc.url} target="_blank" rel="noreferrer"
                        style={{background:C.blueL,color:C.blueDk,borderRadius:5,padding:"5px 10px",fontSize:11,fontWeight:600,textDecoration:"none",display:"flex",alignItems:"center",gap:4}}>
                        <i className="ti ti-external-link" style={{fontSize:12}} aria-hidden="true"/> Ouvrir
                      </a>
                      <a href={doc.url} download={doc.name}
                        style={{background:"#F1F5F9",color:C.t2,borderRadius:5,padding:"5px 8px",textDecoration:"none",display:"flex",alignItems:"center"}}>
                        <i className="ti ti-download" style={{fontSize:12}} aria-hidden="true"/>
                      </a>
                      <button onClick={()=>deleteDoc(doc)}
                        style={{background:C.redL,color:C.redDk,border:"none",borderRadius:5,width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                        <i className="ti ti-trash" style={{fontSize:12}} aria-hidden="true"/>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── TRÉSORERIE PAGE ──────────────────────────────────────────────────────────
function TresoreriePage({getAllOrders,clients,lang,isMobile}:any){
  const today=new Date();today.setHours(0,0,0,0);
  const all=getAllOrders();

  // Build 6-month forecast from today
  const months=Array.from({length:6},(_,i)=>{
    const d=new Date(today.getFullYear(),today.getMonth()+i,1);
    return{year:d.getFullYear(),month:d.getMonth(),label:MONTHS[d.getMonth()]+" "+d.getFullYear()};
  });

  // For each month: sum of invoice remainders whose dueDate falls in that month
  const forecast=months.map(({year,month,label})=>{
    let expected=0,overdue=0,collected=0;
    all.forEach((o:any)=>{
      (o.invoices||[]).forEach((inv:any)=>{
        const ps=payStatus(inv);
        // Already collected this month
        (inv.payments||[]).forEach((p:any)=>{
          const pd=p.date?new Date(p.date+"T00:00:00"):null;
          if(pd&&pd.getFullYear()===year&&pd.getMonth()===month) collected+=(+p.amount||0);
        });
        // Expected: remaining due this month
        if(ps.rem>0&&inv.dueDate){
          const dd=new Date(inv.dueDate+"T00:00:00");
          if(dd.getFullYear()===year&&dd.getMonth()===month) expected+=ps.rem;
          if(dd<today&&ps.rem>0){
            const overD=new Date(today.getFullYear(),today.getMonth(),1);
            if(year===overD.getFullYear()&&month===overD.getMonth()) overdue+=ps.rem;
          }
        }
      });
    });
    return{label,year,month,expected,overdue,collected};
  });

  // Global stats
  const allInvoices=all.flatMap((o:any)=>(o.invoices||[]).map((i:any)=>({...i,_client:o._client})));
  const totalExpected=allInvoices.reduce((s:number,i:any)=>s+payStatus(i).rem,0);
  const overdueTotal=allInvoices.filter((i:any)=>["overdue","ov_part"].includes(payStatus(i).key)).reduce((s:number,i:any)=>s+payStatus(i).rem,0);
  const next30=forecast.slice(0,2).reduce((s:number,m:any)=>s+m.expected,0);
  const maxBar=Math.max(...forecast.map(m=>Math.max(m.expected+m.overdue,m.collected)),1);

  // Upcoming payments list
  const upcoming=allInvoices.filter((i:any)=>{
    const ps=payStatus(i);
    if(ps.rem<=0||!i.dueDate)return false;
    const dd=new Date(i.dueDate+"T00:00:00");
    const future=new Date(today.getFullYear(),today.getMonth()+6,0);
    return dd<=future;
  }).sort((a:any,b:any)=>new Date(a.dueDate).getTime()-new Date(b.dueDate).getTime());

  return(
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      {/* Header */}
      <div>
        <h1 style={{margin:"0 0 4px",fontSize:22,fontWeight:700,color:C.t1}}>Trésorerie prévisionnelle</h1>
        <p style={{margin:0,color:C.t3,fontSize:13}}>Encaissements prévus sur les 6 prochains mois</p>
      </div>

      {/* KPI strip */}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4,1fr)",gap:14}}>
        <div style={{background:"#fff",borderRadius:C.rLg,border:`1px solid ${C.b}`,boxShadow:C.sh,padding:"16px 18px"}}>
          <div style={{fontSize:10,color:C.t3,fontWeight:600,textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>Total à encaisser</div>
          <div style={{fontSize:20,fontWeight:800,color:C.blue}}>{fmtK(totalExpected)} €</div>
          <div style={{fontSize:11,color:C.t3,marginTop:3}}>Toutes échéances confondues</div>
        </div>
        <div style={{background:C.redL,borderRadius:C.rLg,border:`1px solid ${C.red}30`,boxShadow:C.sh,padding:"16px 18px"}}>
          <div style={{fontSize:10,color:C.redDk,fontWeight:600,textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>Échu non réglé</div>
          <div style={{fontSize:20,fontWeight:800,color:C.redDk}}>{fmtK(overdueTotal)} €</div>
          <div style={{fontSize:11,color:C.redDk,marginTop:3}}>À recouvrer en priorité</div>
        </div>
        <div style={{background:C.amberL,borderRadius:C.rLg,border:`1px solid ${C.amber}30`,boxShadow:C.sh,padding:"16px 18px"}}>
          <div style={{fontSize:10,color:C.amberDk,fontWeight:600,textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>Prévu ce mois + suivant</div>
          <div style={{fontSize:20,fontWeight:800,color:C.amberDk}}>{fmtK(next30)} €</div>
          <div style={{fontSize:11,color:C.amberDk,marginTop:3}}>À encaisser sous 60 jours</div>
        </div>
        <div style={{background:C.greenL,borderRadius:C.rLg,border:`1px solid ${C.green}30`,boxShadow:C.sh,padding:"16px 18px"}}>
          <div style={{fontSize:10,color:C.greenDk,fontWeight:600,textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>Encaissé ce mois-ci</div>
          <div style={{fontSize:20,fontWeight:800,color:C.greenDk}}>{fmtK(forecast[0]?.collected||0)} €</div>
          <div style={{fontSize:11,color:C.greenDk,marginTop:3}}>{MONTHS[today.getMonth()]} {today.getFullYear()}</div>
        </div>
      </div>

      {/* Bar chart + table side by side */}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1.2fr 1fr",gap:16,alignItems:"start"}}>

        {/* Bar chart */}
        <div style={{background:"#fff",borderRadius:C.rLg,border:`1px solid ${C.b}`,boxShadow:C.sh,padding:"18px 20px"}}>
          <div style={{fontSize:13,fontWeight:600,color:C.t1,marginBottom:4}}>Projection mensuelle</div>
          <div style={{display:"flex",gap:16,marginBottom:16}}>
            {[[C.red,"Échu"],[C.amber,"À encaisser"],[C.green,"Encaissé"]].map(([c,l])=>(
              <span key={l as string} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:C.t3}}>
                <span style={{width:10,height:10,borderRadius:2,background:c as string,display:"inline-block"}}/>
                {l}
              </span>
            ))}
          </div>
          <div style={{display:"flex",gap:8,alignItems:"flex-end",height:160}}>
            {forecast.map((m,i)=>(
              <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4,height:"100%",justifyContent:"flex-end"}}>
                <div style={{width:"100%",display:"flex",flexDirection:"column",gap:1,alignItems:"stretch",height:"100%",justifyContent:"flex-end"}}>
                  {m.overdue>0&&<div title={`Échu: ${fmt(m.overdue)} €`} style={{background:C.red,borderRadius:i===0?"3px 3px 0 0":"0",height:`${(m.overdue/maxBar)*100}%`,minHeight:3,opacity:.85}}/>}
                  {m.expected>0&&<div title={`À encaisser: ${fmt(m.expected)} €`} style={{background:C.amber,borderRadius:m.overdue>0?"0":i===0?"3px 3px 0 0":"0",height:`${(m.expected/maxBar)*100}%`,minHeight:3,opacity:.85}}/>}
                  {m.collected>0&&<div title={`Encaissé: ${fmt(m.collected)} €`} style={{background:C.green,borderRadius:"3px 3px 0 0",height:`${(m.collected/maxBar)*100}%`,minHeight:3,position:"absolute",bottom:20,opacity:.9}}/>}
                </div>
                <div style={{fontSize:9,color:C.t3,textAlign:"center",lineHeight:1.2}}>{m.label}</div>
              </div>
            ))}
          </div>
          {/* Values below */}
          <div style={{display:"flex",gap:8,marginTop:8}}>
            {forecast.map((m,i)=>(
              <div key={i} style={{flex:1,textAlign:"center"}}>
                {(m.expected+m.overdue)>0&&<div style={{fontSize:9,color:m.overdue>0?C.redDk:C.amberDk,fontWeight:600}}>{fmtK(m.expected+m.overdue)}</div>}
                {m.collected>0&&<div style={{fontSize:9,color:C.greenDk,fontWeight:600}}>{fmtK(m.collected)}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming payments list */}
        <div style={{background:"#fff",borderRadius:C.rLg,border:`1px solid ${C.b}`,boxShadow:C.sh,overflow:"hidden"}}>
          <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.b}`,fontWeight:600,fontSize:13,color:C.t1}}>
            Prochaines échéances
          </div>
          <div style={{maxHeight:320,overflowY:"auto"}}>
            {upcoming.length===0&&<div style={{padding:"24px",textAlign:"center",color:C.t3,fontSize:12}}>Aucune échéance à venir</div>}
            {upcoming.slice(0,15).map((inv:any,i:number)=>{
              const ps=payStatus(inv);
              const dd=inv.dueDate?diffD(inv.dueDate):null;
              const isOver=dd!==null&&dd<0;
              const isSoon=dd!==null&&dd>=0&&dd<=7;
              return(
                <div key={i} style={{display:"flex",gap:10,alignItems:"center",padding:"10px 16px",borderBottom:`1px solid ${C.b}`,background:isOver?C.redL:isSoon?C.amberL:"#fff"}}>
                  <div style={{width:36,height:36,borderRadius:8,background:isOver?C.red:isSoon?C.amber:C.blue,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <span style={{fontSize:10,fontWeight:800,color:"#fff",textAlign:"center",lineHeight:1.2}}>
                      {isOver?`${Math.abs(dd!)}j`:dd===0?"AUJ":`${dd}j`}
                    </span>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:600,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{inv._client}</div>
                    <div style={{fontSize:10,color:C.t3}}>{inv.invoiceNumber} · Éch. {fmtD(inv.dueDate)}</div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:13,fontWeight:700,color:isOver?C.redDk:C.t1}}>{fmtK(ps.rem)} €</div>
                    <Tag label={ps.label} c={ps.color} bg={ps.bg} sm/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detailed table */}
      <div style={{background:"#fff",borderRadius:C.rLg,border:`1px solid ${C.b}`,boxShadow:C.sh,overflow:"hidden"}}>
        <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.b}`,fontWeight:600,fontSize:13,color:C.t1}}>
          Détail par mois
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead>
              <tr style={{background:"#F8FAFC",borderBottom:`1px solid ${C.b}`}}>
                {["Mois","Échu non réglé","À encaisser","Encaissé","Total prévu"].map((h,i)=>(
                  <th key={h} style={{padding:"10px 16px",textAlign:i===0?"left":"right",color:C.t3,fontWeight:600,fontSize:11}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {forecast.map((m,i)=>{
                const total=m.overdue+m.expected;
                return(
                  <tr key={i} style={{borderBottom:`1px solid ${C.b}`,background:i%2===0?"#fff":"#FAFBFD"}}>
                    <td style={{padding:"10px 16px",fontWeight:600,color:C.t1}}>{m.label}</td>
                    <td style={{padding:"10px 16px",textAlign:"right",fontWeight:m.overdue>0?700:400,color:m.overdue>0?C.redDk:C.t3}}>{m.overdue>0?`${fmt(m.overdue)} €`:"—"}</td>
                    <td style={{padding:"10px 16px",textAlign:"right",fontWeight:m.expected>0?600:400,color:m.expected>0?C.amberDk:C.t3}}>{m.expected>0?`${fmt(m.expected)} €`:"—"}</td>
                    <td style={{padding:"10px 16px",textAlign:"right",fontWeight:m.collected>0?600:400,color:m.collected>0?C.greenDk:C.t3}}>{m.collected>0?`${fmt(m.collected)} €`:"—"}</td>
                    <td style={{padding:"10px 16px",textAlign:"right",fontWeight:700,color:total>0?C.blue:C.t3}}>{total>0?`${fmt(total)} €`:"—"}</td>
                  </tr>
                );
              })}
              <tr style={{background:C.blueL,borderTop:`2px solid ${C.blue}30`}}>
                <td style={{padding:"10px 16px",fontWeight:700,color:C.blueDk}}>TOTAL 6 MOIS</td>
                <td style={{padding:"10px 16px",textAlign:"right",fontWeight:700,color:C.redDk}}>{fmt(forecast.reduce((s,m)=>s+m.overdue,0))} €</td>
                <td style={{padding:"10px 16px",textAlign:"right",fontWeight:700,color:C.amberDk}}>{fmt(forecast.reduce((s,m)=>s+m.expected,0))} €</td>
                <td style={{padding:"10px 16px",textAlign:"right",fontWeight:700,color:C.greenDk}}>{fmt(forecast.reduce((s,m)=>s+m.collected,0))} €</td>
                <td style={{padding:"10px 16px",textAlign:"right",fontWeight:800,color:C.blueDk,fontSize:14}}>{fmt(forecast.reduce((s,m)=>s+m.overdue+m.expected,0))} €</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── SEARCH OVERLAY ──────────────────────────────────────────────────────────
function SearchOverlay({clients,data,navigate,onClose,lang="fr"}:any){
  const tr=(k:string,v?:any)=>t(lang as Lang,k,v);
  const[q,setQ]=useState("");
  const ref=React.useRef<HTMLInputElement>(null);
  React.useEffect(()=>{ref.current?.focus();},[]);

  const results:any[]=[];
  if(q.trim().length>=2){
    const lq=q.trim().toLowerCase();
    (clients||[]).forEach((c:string)=>{
      (data?.[c]||[]).forEach((o:any)=>{
        const match=(v:string)=>String(v||"").toLowerCase().includes(lq);
        if(match(o.poNumber)||match(o.soNumber)||match(o.notes)){
          // Compute invoice/payment info for preview
          const totInv=(o.invoices||[]).reduce((s:number,i:any)=>s+(+i.amount||0),0);
          const totPaid=(o.invoices||[]).reduce((s:number,i:any)=>s+(i.payments||[]).reduce((ss:number,p:any)=>ss+(+p.amount||0),0),0);
          const open=Math.max(0,(+o.amount||0)-totInv);
          results.push({type:"order",client:c,label:o.poNumber,sub:`S/O ${o.soNumber||"—"} · ${o.status||""}`,amount:+o.amount||0,orderId:o.id,
            extra:{date:o.date,status:o.status,amount:+o.amount||0,invoiced:totInv,paid:totPaid,open,nb:(o.invoices||[]).length}});
        }
        (o.invoices||[]).forEach((i:any)=>{
          if(match(i.invoiceNumber)||match(i.notes)){
            const paid=(i.payments||[]).reduce((s:number,p:any)=>s+(+p.amount||0),0);
            const ps=payStatus(i);
            results.push({type:"invoice",client:c,label:i.invoiceNumber,sub:`PO ${o.poNumber} · ${fmt(+i.amount||0)} €`,amount:+i.amount||0,orderId:o.id,
              extra:{date:i.date,dueDate:i.dueDate,amount:+i.amount||0,paid,rem:ps.rem,psLabel:ps.label,psColor:ps.color,psBg:ps.bg,poNumber:o.poNumber}});
          }
          (i.payments||[]).forEach((p:any)=>{
            if(match(p.reference)||match(p.notes)){
              results.push({type:"payment",client:c,label:`Paiement ${p.reference||"—"}`,sub:`Facture ${i.invoiceNumber} · ${fmt(+p.amount||0)} €`,amount:+p.amount||0,orderId:o.id,
                extra:{date:p.date,method:p.method,reference:p.reference,amount:+p.amount||0,invoiceNumber:i.invoiceNumber,poNumber:o.poNumber}});
            }
          });
        });
      });
    });
  }

  const typeIcon:any={order:"ti-clipboard-list",invoice:"ti-receipt",payment:"ti-coin"};
  const typeColor:any={order:C.blue,invoice:C.teal,payment:C.green};
  const typeLabel:any={order:"Commande",invoice:"Facture",payment:"Paiement"};

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,.6)",zIndex:200,display:"flex",flexDirection:"column",alignItems:"center",paddingTop:80,backdropFilter:"blur(3px)"}} onClick={(e:any)=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{width:600,maxWidth:"94vw",background:"#fff",borderRadius:C.rLg,boxShadow:"0 20px 60px rgba(0,0,0,.25)",overflow:"hidden"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"14px 18px",borderBottom:`1px solid ${C.b}`}}>
          <i className="ti ti-search" style={{fontSize:18,color:C.t3}} aria-hidden="true"/>
          <input ref={ref} value={q} onChange={e=>setQ(e.target.value)} placeholder={tr("search_placeholder")} style={{flex:1,border:"none",outline:"none",fontSize:14,color:C.t1,fontFamily:"inherit"}}/>
          {q&&<button onClick={()=>setQ("")} style={{background:"none",border:"none",color:C.t3,cursor:"pointer",fontSize:16}}><i className="ti ti-x" aria-hidden="true"/></button>}
          <button onClick={onClose} style={{background:"#F1F5F9",border:"none",color:C.t3,cursor:"pointer",borderRadius:5,padding:"4px 8px",fontSize:11}}>Esc</button>
        </div>
        <div style={{maxHeight:440,overflowY:"auto"}}>
          {q.trim().length<2&&(
            <div style={{padding:"32px 20px",textAlign:"center",color:C.t3}}>
              <i className="ti ti-search" style={{fontSize:32,display:"block",marginBottom:8,opacity:.4}} aria-hidden="true"/>
              <div style={{fontSize:13}}>Tapez au moins 2 caractères pour rechercher</div>
            </div>
          )}
          {q.trim().length>=2&&results.length===0&&(
            <div style={{padding:"32px 20px",textAlign:"center",color:C.t3}}>
              <i className="ti ti-search-off" style={{fontSize:32,display:"block",marginBottom:8,opacity:.4}} aria-hidden="true"/>
              <div style={{fontSize:13}}>Aucun résultat pour « {q} »</div>
            </div>
          )}
          {results.slice(0,20).map((r,i)=>(
            <div key={i} onClick={()=>navigate(r.client, r.orderId||null)}
              style={{display:"flex",flexDirection:"column",gap:0,padding:"12px 18px",cursor:"pointer",borderBottom:`1px solid ${C.b}`,transition:"background .1s"}}
              onMouseEnter={(e:any)=>e.currentTarget.style.background="#F8FAFC"}
              onMouseLeave={(e:any)=>e.currentTarget.style.background="transparent"}>
              {/* Main row */}
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:32,height:32,borderRadius:8,background:typeColor[r.type]+"18",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <i className={`ti ${typeIcon[r.type]}`} style={{fontSize:15,color:typeColor[r.type]}} aria-hidden="true"/>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:13,color:C.t1}}>{r.label}</div>
                  <div style={{fontSize:11,color:C.t3,marginTop:1}}>{r.sub}</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3}}>
                  <div style={{fontSize:11,background:typeColor[r.type]+"18",color:typeColor[r.type],padding:"2px 8px",borderRadius:4,fontWeight:600}}>{typeLabel[r.type]}</div>
                  <div style={{fontSize:11,color:C.t3}}>{r.client}</div>
                </div>
              </div>
              {/* Detail preview */}
              {r.extra&&<div style={{marginTop:8,marginLeft:44,display:"flex",flexWrap:"wrap",gap:6}}>
                {r.type==="order"&&<>
                  <Chip label={`PO : ${fmt(r.extra.amount)} €`} c={C.blue}/>
                  <Chip label={`Facturé : ${fmt(r.extra.invoiced)} €`} c={C.teal}/>
                  <Chip label={`Encaissé : ${fmt(r.extra.paid)} €`} c={C.green}/>
                  {r.extra.open>0&&<Chip label={`Reste : ${fmt(r.extra.open)} €`} c={C.amber}/>}
                  <Chip label={`${r.extra.nb} facture${r.extra.nb>1?"s":""}`} c={C.t3}/>
                  <Chip label={fmtD(r.extra.date)} c={C.t3}/>
                </>}
                {r.type==="invoice"&&<>
                  <Chip label={`PO ${r.extra.poNumber}`} c={C.blue}/>
                  <Chip label={`${fmt(r.extra.amount)} €`} c={C.teal}/>
                  {r.extra.paid>0&&<Chip label={`Payé : ${fmt(r.extra.paid)} €`} c={C.green}/>}
                  {r.extra.rem>0&&<Chip label={`Reste : ${fmt(r.extra.rem)} €`} c={r.extra.psColor}/>}
                  <span style={{fontSize:10,background:r.extra.psBg,color:r.extra.psColor,padding:"2px 7px",borderRadius:4,fontWeight:600}}>{r.extra.psLabel}</span>
                  {r.extra.dueDate&&<Chip label={`Échéance : ${fmtD(r.extra.dueDate)}`} c={C.t3}/>}
                </>}
                {r.type==="payment"&&<>
                  <Chip label={`PO ${r.extra.poNumber}`} c={C.blue}/>
                  <Chip label={`Facture ${r.extra.invoiceNumber}`} c={C.teal}/>
                  <Chip label={`${fmt(r.extra.amount)} €`} c={C.green}/>
                  {r.extra.method&&<Chip label={r.extra.method} c={C.t3}/>}
                  <Chip label={fmtD(r.extra.date)} c={C.t3}/>
                </>}
              </div>}
              <div style={{marginTop:8,marginLeft:44,fontSize:11,color:typeColor[r.type],fontWeight:500,display:"flex",alignItems:"center",gap:4}}>
                <i className="ti ti-arrow-right" style={{fontSize:12}} aria-hidden="true"/> Cliquer pour ouvrir et modifier
              </div>
            </div>
          ))}
          {results.length>20&&<div style={{padding:"10px 18px",textAlign:"center",fontSize:11,color:C.t3}}>+{results.length-20} résultats — affinez votre recherche</div>}
        </div>
      </div>
    </div>
  );
}

function Chip({label,c}:any){return<span style={{fontSize:10,background:c+"18",color:c,padding:"2px 7px",borderRadius:4,fontWeight:500,whiteSpace:"nowrap"}}>{label}</span>;}

// ─── REPORT MODAL ────────────────────────────────────────────────────────────
function ReportModal({clients,data,configs,onClose,lang="fr"}:any){
  const tr=(k:string,v?:any)=>t(lang as Lang,k,v);
  const[rtype,setRtype]=useState("open_orders");
  const[fromDate,setFromDate]=useState(new Date().getFullYear()+"-01-01");
  const[toDate,setToDate]=useState(new Date().toISOString().split("T")[0]);
  const[selCustomers,setSelCustomers]=useState<string[]>(clients||[]);
  const toggleCustomer=(c:string)=>setSelCustomers(p=>p.includes(c)?p.filter(x=>x!==c):[...p,c]);

  const generate=()=>{
    const fd=new Date(fromDate+"T00:00:00"),td=new Date(toDate+"T00:00:00");
    td.setHours(23,59,59);
    const inRange=(d:string)=>{if(!d)return true;const dt=new Date(d+"T00:00:00");return dt>=fd&&dt<=td;};
    const allOrders=selCustomers.flatMap(c=>(data?.[c]||[]).map((o:any)=>({...o,_client:c})));

    // ── Month helpers ────────────────────────────────────────────────────────
    const monthKey=(d:string)=>d?d.slice(0,7):"0000-00";
    const monthLabel=(d:string)=>{
      if(!d)return"Sans date";
      const dt=new Date(d+"T00:00:00");
      return dt.toLocaleDateString("fr-FR",{month:"long",year:"numeric"}).replace(/^./,c=>c.toUpperCase());
    };

    // ── Sort by date + group by month with subtotals ──────────────────────────
    const withMonthly=(items:any[],dateField:string,rowFn:(i:any)=>string,subtotalFn:(grp:any[],label:string)=>string,totalFn:(all:any[])=>string)=>{
      const sorted=[...items].sort((a:any,b:any)=>(a[dateField]||"").localeCompare(b[dateField]||""));
      const byMonth:Record<string,any[]>={};
      sorted.forEach((i:any)=>{const k=monthKey(i[dateField]);if(!byMonth[k])byMonth[k]=[];byMonth[k].push(i);});
      let out="";
      Object.keys(byMonth).sort().forEach(k=>{
        const grp=byMonth[k];
        const label=monthLabel(grp[0][dateField]);
        out+=`<tr style="background:#1E3A5F"><td colspan="99" style="padding:7px 12px;color:#93C5FD;font-weight:700;font-size:11px;letter-spacing:.06em;text-transform:uppercase">📅 ${label}</td></tr>`;
        out+=grp.map(rowFn).join("");
        out+=subtotalFn(grp,label);
      });
      out+=totalFn(sorted);
      return out;
    };

    let rows="",title="";

    if(rtype==="open_orders"){
      title="Open Orders — Commandes non entièrement facturées";
      const items=allOrders.filter((o:any)=>{const inv=(o.invoices||[]).reduce((s:number,i:any)=>s+(+i.amount||0),0);return inv<(+o.amount||0)*0.999&&o.status!=="annule";});
      const rowOpen=(o:any)=>{const inv=(o.invoices||[]).reduce((s:number,i:any)=>s+(+i.amount||0),0);const open=Math.max(0,(+o.amount||0)-inv);return `<tr><td>${o._client}</td><td>${o.poNumber||"—"}</td><td>${o.soNumber||"—"}</td><td>${fmtD(o.date)}</td><td>${o.status||"—"}</td><td style="text-align:right">${fmt(+o.amount||0)} €</td><td style="text-align:right">${fmt(inv)} €</td><td style="text-align:right;font-weight:700;color:#B45309">${fmt(open)} €</td></tr>`;};
      const subOpen=(grp:any[],label:string)=>{const s=grp.reduce((acc:number,o:any)=>{const inv=(o.invoices||[]).reduce((ss:number,i:any)=>ss+(+i.amount||0),0);return acc+Math.max(0,(+o.amount||0)-inv);},0);return `<tr style="background:#FEF9EC;font-weight:700"><td colspan="7" style="text-align:right;color:#B45309;font-style:italic;padding:6px 10px">Subtotal ${label}</td><td style="text-align:right;color:#B45309;padding:6px 10px">${fmt(s)} €</td></tr>`;};
      const totOpen=(all:any[])=>{const t=all.reduce((acc:number,o:any)=>{const inv=(o.invoices||[]).reduce((ss:number,i:any)=>ss+(+i.amount||0),0);return acc+Math.max(0,(+o.amount||0)-inv);},0);return `<tr style="background:#FEF3C7;font-weight:800;font-size:12px"><td colspan="7" style="text-align:right;padding:8px 10px">TOTAL OPEN ORDERS</td><td style="text-align:right;padding:8px 10px">${fmt(t)} €</td></tr>`;};
      rows=withMonthly(items,"date",rowOpen,subOpen,totOpen);
      printReport(title,fromDate,toDate,"<tr><th>Customer</th><th>PO #</th><th>S/O #</th><th>Date</th><th>Statut</th><th>PO (€)</th><th>Facturé (€)</th><th>Reste (€)</th></tr>",rows);

    } else if(rtype==="overdue"){
      title="Factures échues — Échéances dépassées non soldées";
      const items=allOrders.flatMap((o:any)=>(o.invoices||[]).map((i:any)=>{
        const paid=(i.payments||[]).reduce((s:number,p:any)=>s+(+p.amount||0),0);
        const rem=Math.max(0,(+i.amount||0)-paid);
        const ps=payStatus(i);
        const isOverdue=["overdue","ov_part"].includes(ps.key);
        return{...i,_client:o._client,_po:o.poNumber,paid,rem,psLabel:ps.label,isOverdue,daysLate:i.dueDate?Math.abs(diffD(i.dueDate)):0};
      }).filter((i:any)=>i.isOverdue&&i.rem>0));
      const rowColor=(d:number)=>d>90?"#B91C1C":d>30?"#DC2626":"#EF4444";
      const rowOver=(i:any)=>`<tr style="border-left:3px solid ${rowColor(i.daysLate)}"><td style="font-weight:700">${i._client}</td><td>${i._po||"—"}</td><td>${i.invoiceNumber||"—"}</td><td>${fmtD(i.date)}</td><td style="color:#B91C1C;font-weight:700">${fmtD(i.dueDate)}</td><td style="text-align:center;background:#FEE2E2;color:#B91C1C;font-weight:800">${i.daysLate}j</td><td style="text-align:right">${fmt(+i.amount||0)} €</td><td style="text-align:right">${fmt(i.paid)} €</td><td style="text-align:right;font-weight:700;color:#B91C1C">${fmt(i.rem)} €</td></tr>`;
      const subOver=(grp:any[],label:string)=>`<tr style="background:#FFF0F0;font-weight:700"><td colspan="8" style="text-align:right;color:#B91C1C;font-style:italic;padding:6px 10px">Subtotal ${label}</td><td style="text-align:right;color:#B91C1C;padding:6px 10px">${fmt(grp.reduce((s:number,i:any)=>s+i.rem,0))} €</td></tr>`;
      const totOver=(all:any[])=>`<tr style="background:#FEE2E2;font-weight:800;font-size:12px"><td colspan="8" style="text-align:right;padding:8px 10px;color:#B91C1C">TOTAL OVERDUE</td><td style="text-align:right;padding:8px 10px;color:#B91C1C">${fmt(all.reduce((s:number,i:any)=>s+i.rem,0))} €</td></tr>`;
      rows=withMonthly(items,"dueDate",rowOver,subOver,totOver);
      printReport(title,fromDate,toDate,"<tr><th>Customer</th><th>PO #</th><th>Invoice #</th><th>Date Facture</th><th>Échéance</th><th>Retard</th><th>Montant (€)</th><th>Payé (€)</th><th>Reste Dû (€)</th></tr>",rows);

    } else if(rtype==="upcoming"){
      title="Échéances à venir — 30 prochains jours";
      const today30=new Date();today30.setDate(today30.getDate()+30);
      const items=allOrders.flatMap((o:any)=>(o.invoices||[]).map((i:any)=>{
        const paid=(i.payments||[]).reduce((s:number,p:any)=>s+(+p.amount||0),0);
        const rem=Math.max(0,(+i.amount||0)-paid);
        if(rem<=0||!i.dueDate)return null;
        const due=new Date(i.dueDate+"T00:00:00"),now=new Date();now.setHours(0,0,0,0);
        if(due<now||due>today30)return null;
        const daysLeft=Math.ceil((due.getTime()-now.getTime())/86400000);
        return{...i,_client:o._client,_po:o.poNumber,paid,rem,psLabel:payStatus(i).label,daysLeft};
      }).filter(Boolean));
      const urgColor=(d:number)=>d===0?"#B91C1C":d<=3?"#DC2626":d<=7?"#D97706":"#0369A1";
      const rowUp=(i:any)=>`<tr><td style="font-weight:700">${i._client}</td><td>${i._po||"—"}</td><td>${i.invoiceNumber||"—"}</td><td>${fmtD(i.date)}</td><td style="font-weight:700;color:#0369A1">${fmtD(i.dueDate)}</td><td style="text-align:center;font-weight:800;color:${urgColor(i.daysLeft)}">${i.daysLeft===0?"Auj.":i.daysLeft+"j"}</td><td style="text-align:right">${fmt(+i.amount||0)} €</td><td style="text-align:right">${fmt(i.paid)} €</td><td style="text-align:right;font-weight:700;color:#0369A1">${fmt(i.rem)} €</td><td><span style="background:#DBEAFE;color:#1D4ED8;padding:2px 7px;border-radius:4px;font-size:10px">${i.psLabel}</span></td></tr>`;
      const subUp=(grp:any[],label:string)=>`<tr style="background:#EFF6FF;font-weight:700"><td colspan="8" style="text-align:right;color:#1D4ED8;font-style:italic;padding:6px 10px">Subtotal ${label}</td><td style="text-align:right;color:#1D4ED8;padding:6px 10px">${fmt(grp.reduce((s:number,i:any)=>s+i.rem,0))} €</td><td></td></tr>`;
      const totUp=(all:any[])=>`<tr style="background:#DBEAFE;font-weight:800;font-size:12px"><td colspan="8" style="text-align:right;padding:8px 10px;color:#1D4ED8">TOTAL TO COLLECT</td><td style="text-align:right;padding:8px 10px;color:#1D4ED8">${fmt(all.reduce((s:number,i:any)=>s+i.rem,0))} €</td><td></td></tr>`;
      rows=withMonthly(items,"dueDate",rowUp,subUp,totUp);
      printReport(title,fromDate,toDate,"<tr><th>Customer</th><th>PO #</th><th>Invoice #</th><th>Date émission</th><th>Échéance</th><th>Délai</th><th>Montant (€)</th><th>Payé (€)</th><th>Reste dû (€)</th><th>Statut</th></tr>",rows);

    } else if(rtype==="unpaid"){
      title="Factures en cours";
      const items=allOrders.flatMap((o:any)=>(o.invoices||[]).filter((i:any)=>inRange(i.date)).map((i:any)=>{const paid=(i.payments||[]).reduce((s:number,p:any)=>s+(+p.amount||0),0);const rem=Math.max(0,(+i.amount||0)-paid);return{...i,_client:o._client,_po:o.poNumber,paid,rem,psLabel:payStatus(i).label};}).filter((i:any)=>i.rem>0));
      const rowUnp=(i:any)=>`<tr><td>${i._client}</td><td>${i._po||"—"}</td><td>${i.invoiceNumber||"—"}</td><td>${fmtD(i.date)}</td><td>${fmtD(i.dueDate)}</td><td style="text-align:right">${fmt(+i.amount||0)} €</td><td style="text-align:right">${fmt(i.paid)} €</td><td style="text-align:right;font-weight:700;color:#DC2626">${fmt(i.rem)} €</td><td><span style="background:#FEE2E2;color:#B91C1C;padding:2px 8px;border-radius:4px;font-size:10px">${i.psLabel}</span></td></tr>`;
      const subUnp=(grp:any[],label:string)=>`<tr style="background:#FFF5F5;font-weight:700"><td colspan="7" style="text-align:right;color:#DC2626;font-style:italic;padding:6px 10px">Subtotal ${label}</td><td style="text-align:right;color:#DC2626;padding:6px 10px">${fmt(grp.reduce((s:number,i:any)=>s+i.rem,0))} €</td><td></td></tr>`;
      const totUnp=(all:any[])=>`<tr style="background:#FEE2E2;font-weight:800;font-size:12px"><td colspan="7" style="text-align:right;padding:8px 10px">TOTAL UNPAID</td><td style="text-align:right;padding:8px 10px">${fmt(all.reduce((s:number,i:any)=>s+i.rem,0))} €</td><td></td></tr>`;
      rows=withMonthly(items,"date",rowUnp,subUnp,totUnp);
      printReport(title,fromDate,toDate,"<tr><th>Customer</th><th>PO #</th><th>Invoice #</th><th>Date</th><th>Échéance</th><th>Montant (€)</th><th>Payé (€)</th><th>Reste (€)</th><th>Statut</th></tr>",rows);

    } else if(rtype==="all_invoices"){
      title="Toutes les factures sur la période";
      const items=allOrders.flatMap((o:any)=>(o.invoices||[]).filter((i:any)=>inRange(i.date)).map((i:any)=>{const paid=(i.payments||[]).reduce((s:number,p:any)=>s+(+p.amount||0),0);return{...i,_client:o._client,_po:o.poNumber,paid};}));
      const rowAll=(i:any)=>`<tr><td>${i._client}</td><td>${i._po||"—"}</td><td>${i.invoiceNumber||"—"}</td><td>${fmtD(i.date)}</td><td>${fmtD(i.dueDate)}</td><td style="text-align:right">${fmt(+i.amount||0)} €</td><td style="text-align:right">${fmt(i.paid)} €</td><td style="text-align:right">${fmt(Math.max(0,(+i.amount||0)-i.paid))} €</td></tr>`;
      const subAll=(grp:any[],label:string)=>{const si=grp.reduce((s:number,i:any)=>s+(+i.amount||0),0),sp=grp.reduce((s:number,i:any)=>s+i.paid,0);return `<tr style="background:#F0FDFA;font-weight:700"><td colspan="5" style="text-align:right;color:#0D9488;font-style:italic;padding:6px 10px">Subtotal ${label}</td><td style="text-align:right;color:#0D9488;padding:6px 10px">${fmt(si)} €</td><td style="text-align:right;color:#059669;padding:6px 10px">${fmt(sp)} €</td><td style="text-align:right;color:#B45309;padding:6px 10px">${fmt(si-sp)} €</td></tr>`;};
      const totAll=(all:any[])=>{const ti=all.reduce((s:number,i:any)=>s+(+i.amount||0),0),tp=all.reduce((s:number,i:any)=>s+i.paid,0);return `<tr style="background:#CCFBF1;font-weight:800;font-size:12px"><td colspan="5" style="text-align:right;padding:8px 10px">TOTAUX</td><td style="text-align:right;padding:8px 10px">${fmt(ti)} €</td><td style="text-align:right;padding:8px 10px">${fmt(tp)} €</td><td style="text-align:right;padding:8px 10px">${fmt(ti-tp)} €</td></tr>`;};
      rows=withMonthly(items,"date",rowAll,subAll,totAll);
      printReport(title,fromDate,toDate,"<tr><th>Customer</th><th>PO #</th><th>Invoice #</th><th>Date</th><th>Échéance</th><th>Montant (€)</th><th>Payé (€)</th><th>Reste (€)</th></tr>",rows);

    } else {
      title="Synthèse par client";
      rows=selCustomers.map((c:string)=>{const ords=data?.[c]||[];const po=ords.reduce((s:number,o:any)=>s+(+o.amount||0),0);const inv=ords.reduce((s:number,o:any)=>s+(o.invoices||[]).filter((i:any)=>inRange(i.date)).reduce((ss:number,i:any)=>ss+(+i.amount||0),0),0);const paid=ords.reduce((s:number,o:any)=>s+(o.invoices||[]).reduce((ss:number,i:any)=>ss+(i.payments||[]).reduce((sss:number,p:any)=>sss+(+p.amount||0),0),0),0);const open=Math.max(0,po-inv);const term=PAY_TERMS.find((t:any)=>t.id===(configs[c]?.termId||"net60"))?.label||"—";return`<tr><td style="font-weight:700">${c}</td><td>${configs[c]?.accountNumber||"—"}</td><td>${term}</td><td>${ords.length}</td><td style="text-align:right">${fmt(po)} €</td><td style="text-align:right">${fmt(inv)} €</td><td style="text-align:right">${fmt(paid)} €</td><td style="text-align:right;font-weight:700;color:#B45309">${fmt(open)} €</td></tr>`;}).join("");
      const tPO=selCustomers.reduce((s:number,c:string)=>s+(data?.[c]||[]).reduce((ss:number,o:any)=>ss+(+o.amount||0),0),0);
      const tInv=selCustomers.reduce((s:number,c:string)=>s+(data?.[c]||[]).reduce((ss:number,o:any)=>ss+(o.invoices||[]).filter((i:any)=>inRange(i.date)).reduce((sss:number,i:any)=>sss+(+i.amount||0),0),0),0);
      const tPaid=selCustomers.reduce((s:number,c:string)=>s+(data?.[c]||[]).reduce((ss:number,o:any)=>ss+(o.invoices||[]).reduce((sss:number,i:any)=>sss+(i.payments||[]).reduce((ssss:number,p:any)=>ssss+(+p.amount||0),0),0),0),0);
      rows+=`<tr style="background:#DBEAFE;font-weight:800;font-size:12px"><td>TOTAL</td><td></td><td></td><td></td><td style="text-align:right;padding:8px 10px">${fmt(tPO)} €</td><td style="text-align:right;padding:8px 10px">${fmt(tInv)} €</td><td style="text-align:right;padding:8px 10px">${fmt(tPaid)} €</td><td style="text-align:right;padding:8px 10px">${fmt(Math.max(0,tPO-tInv))} €</td></tr>`;
      printReport(title,fromDate,toDate,"<tr><th>Customer</th><th>N° Compte</th><th>Conditions</th><th>Cmds</th><th>PO Total (€)</th><th>Facturé (€)</th><th>Encaissé (€)</th><th>Open Orders (€)</th></tr>",rows);
    }
    onClose();
  };

  const printReport=(title:string,from:string,to:string,headers:string,rows:string)=>{
    const w=window.open("","_blank","width=1100,height=800");
    if(!w)return;
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>
      *{margin:0;padding:0;box-sizing:border-box;}
      body{font-family:Arial,sans-serif;font-size:12px;color:#0D1B2A;padding:28px 32px;}
      .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:3px solid #0D1B2A;}
      .logo{font-size:20px;font-weight:800;color:#2563EB;letter-spacing:-.02em;}
      .meta{text-align:right;font-size:11px;color:#8FA0B3;}
      h1{font-size:16px;font-weight:700;color:#0D1B2A;margin-bottom:4px;}
      .period{font-size:11px;color:#8FA0B3;margin-bottom:20px;}
      table{width:100%;border-collapse:collapse;font-size:11px;}
      th{background:#0D1B2A;color:#fff;padding:8px 10px;text-align:left;font-weight:600;font-size:10px;text-transform:uppercase;letter-spacing:.05em;}
      td{padding:5px 8px;border-bottom:1px solid #E5EAF0;vertical-align:middle;}
      tr:nth-child(even){background:#F8FAFC;}
      .footer{margin-top:20px;padding-top:12px;border-top:1px solid #E5EAF0;font-size:10px;color:#8FA0B3;display:flex;justify-content:space-between;}
      @media print{body{padding:16px;}}
    </style></head><body>
    <div style="position:fixed;top:12px;right:12px;z-index:999;display:flex;gap:8px">
    <button onclick="window.print()" style="background:#1D4ED8;color:#fff;border:none;border-radius:8px;padding:10px 20px;font-size:13px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.3)">🖨️ Print / PDF</button>
    <button onclick="window.close()" style="background:#6B7280;color:#fff;border:none;border-radius:8px;padding:10px 16px;font-size:13px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">✕ Close</button>
    </div>
    <style>@media print{.no-print{display:none!important}}</style>
    <div class="header">
      <div><div class="logo">OrderTrack</div><h1>${title}</h1></div>
      <div class="meta">Généré le ${new Date().toLocaleDateString("fr-FR",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}<br/>Période : ${fmtD(from)} → ${fmtD(to)}</div>
    </div>
    <table><thead>${headers}</thead><tbody>${rows}</tbody></table>
    <div class="footer"><span>OrderTrack — Rapport confidentiel</span><span>Page 1</span></div>
    </body></html>`);
    w.document.close();
  };

  const REPORT_TYPES=[
    {id:"open_orders",  label:"Open Orders",           desc:"Commandes non entièrement facturées",   icon:"ti-hourglass-low",     color:C.amber},
    {id:"overdue",      label:"Factures échues",        desc:"Échéance dépassée, solde non réglé",    icon:"ti-clock-exclamation", color:C.red},
    {id:"upcoming",     label:"Échéances à venir",      desc:"Factures dues dans les 30 prochains jours", icon:"ti-clock",         color:C.purple},
    {id:"unpaid",       label:"Factures en cours",      desc:"Solde non encore encaissé (toutes)",    icon:"ti-alert-circle",      color:"#0D9488"},
    {id:"all_invoices", label:"Toutes les factures",    desc:"Listing complet sur la période",        icon:"ti-receipt",           color:C.teal},
    {id:"summary",      label:"Synthèse clients",       desc:"Récapitulatif par client",              icon:"ti-building-store",    color:C.blue},
  ];

  return(
    <Modal title={tr("report_title")} sub={tr("report_sub")} width={560} onClose={onClose}
      footer={<><button onClick={onClose}>Annuler</button><Btn icon="ti-file-download" label={tr("report_generate")} onClick={generate} variant="primary"/></>}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:18,gridTemplateRows:"auto auto"}}>
        {REPORT_TYPES.map(rt=>(
          <div key={rt.id} onClick={()=>setRtype(rt.id)} style={{cursor:"pointer",border:`2px solid ${rtype===rt.id?rt.color:C.b}`,borderRadius:C.r,padding:"12px 14px",background:rtype===rt.id?rt.color+"10":"#fff",transition:"all .15s"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
              <i className={`ti ${rt.icon}`} style={{fontSize:16,color:rt.color}} aria-hidden="true"/>
              <span style={{fontWeight:600,fontSize:13,color:C.t1}}>{rt.label}</span>
            </div>
            <div style={{fontSize:11,color:C.t3}}>{rt.desc}</div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <Fld label="Date de début" type="date" value={fromDate} onChange={setFromDate}/>
        <Fld label="Date de fin" type="date" value={toDate} onChange={setToDate}/>
      </div>
      <div>
        <Label t="Customers inclus"/>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:4}}>
          <button onClick={()=>setSelCustomers(clients)} style={{fontSize:11,padding:"3px 9px",borderRadius:4,border:`1px solid ${C.b}`,background:"#F8FAFC",cursor:"pointer",color:C.t2}}>Tous</button>
          <button onClick={()=>setSelCustomers([])} style={{fontSize:11,padding:"3px 9px",borderRadius:4,border:`1px solid ${C.b}`,background:"#F8FAFC",cursor:"pointer",color:C.t2}}>Aucun</button>
          {(clients||[]).map((c:string)=>(
            <button key={c} onClick={()=>toggleCustomer(c)} style={{fontSize:11,padding:"3px 9px",borderRadius:4,border:`2px solid ${selCustomers.includes(c)?C.blue:C.b}`,background:selCustomers.includes(c)?C.blueL:"#fff",color:selCustomers.includes(c)?C.blueDk:C.t2,fontWeight:selCustomers.includes(c)?600:400,cursor:"pointer"}}>{c}</button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

// ─── PRICE HISTORY CHART ─────────────────────────────────────────────────────
function PriceHistoryChart({prices}:any){
  if(!prices||prices.length<2)return null;
  const sorted=[...prices].sort((a:any,b:any)=>String(a.date||"").localeCompare(String(b.date||"")));
  const maxP=Math.max(...sorted.map((p:any)=>Number(p.price)||0))||1;
  return(
    <div>
      <div style={{fontSize:10,color:C.t3,fontWeight:700,textTransform:"uppercase",letterSpacing:".05em",marginBottom:8}}>Évolution du prix</div>
      <div style={{display:"flex",gap:4,alignItems:"flex-end",height:70,background:"#F8FAFC",borderRadius:8,border:`1px solid ${C.b}`,padding:"10px 12px",overflowX:"auto"}}>
        {sorted.map((p:any,i:number)=>{
          const pct=Math.max(8,(Number(p.price)/maxP)*100);
          return(
            <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,minWidth:48,flex:1}}>
              <span style={{fontSize:9,fontWeight:700,color:C.blue,whiteSpace:"nowrap"}}>{fmt(Number(p.price))}€</span>
              <div style={{width:"100%",height:pct+"%",background:`linear-gradient(180deg,${C.blue},${C.blueL})`,borderRadius:"3px 3px 0 0",minHeight:6}}/>
              <span style={{fontSize:8,color:C.t3,whiteSpace:"nowrap"}}>{String(p.date||"").substring(2,7)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── ACTIVITY LOGS PAGE ──────────────────────────────────────────────────────
function ActivityLogsPage({session}:any){
  const[logs,setLogs]=useState<any[]>([]);
  const[loading,setLoading]=useState(true);
  const[filter,setFilter]=useState("");
  const K="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4eHJ4bnl4Zm1nY2R6eGNpZ2R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMTg5MzIsImV4cCI6MjA5NTc5NDkzMn0.wF2mt8BK1KGk-VyK4zZQvFGJCxCp8UGDPdgT_8DHc6o";
  const B="https://vxxrxnyxfmgcdzxcigdw.supabase.co";
  useEffect(()=>{
    fetch(B+"/rest/v1/ordertrack_data?apikey="+K+"&user_key=eq."+LOG_KEY+"&select=payload&limit=1",
      {headers:{"apikey":K,"Authorization":"Bearer "+K}})
      .then(r=>r.ok?r.json():null)
      .then(rows=>{setLogs(rows?.[0]?.payload?.logs||[]);setLoading(false);})
      .catch(()=>setLoading(false));
  },[]);
  const exportLogs=async()=>{
    const headers=["Date & Heure","Action","Détail","Utilisateur"];
    const rows=logs.map((l:any)=>[new Date(l.ts).toLocaleString("fr-FR"),l.action,l.detail,l.user]);
    await exportToExcel([headers,...rows],"logs_ordertrack_"+new Date().toISOString().slice(0,10)+".xlsx","Logs");
  };
  const filtered=logs.filter((l:any)=>!filter||
    l.action?.toLowerCase().includes(filter.toLowerCase())||
    l.user?.toLowerCase().includes(filter.toLowerCase())
  );
  const ACTION_COLORS:any={Commande:C.blue,Facture:C.teal,Paiement:C.green,Suppression:C.red,Connexion:"#7C3AED",Devis:C.amber};
  const getColor=(action:string)=>{for(const[k,v] of Object.entries(ACTION_COLORS)){if(action?.includes(k))return v as string;}return C.t3;};
  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
        <div>
          <h1 style={{margin:"0 0 4px",fontSize:22,fontWeight:700,color:C.t1}}>Logs d'activité</h1>
          <p style={{margin:0,color:C.t3,fontSize:13}}>{logs.length} événements enregistrés</p>
        </div>
        <button onClick={exportLogs} style={{display:"flex",alignItems:"center",gap:7,background:C.greenL,color:C.greenDk,border:"none",borderRadius:C.r,padding:"9px 16px",fontSize:12,fontWeight:600,cursor:"pointer"}}>
          <i className="ti ti-file-spreadsheet" style={{fontSize:14}} aria-hidden="true"/> Exporter Excel
        </button>
      </div>
      <div style={{position:"relative"}}>
        <i className="ti ti-search" style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:14,color:C.t3}} aria-hidden="true"/>
        <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Filtrer par action ou utilisateur…"
          style={{width:"100%",padding:"9px 12px 9px 36px",border:`1px solid ${C.b}`,borderRadius:C.r,fontSize:12,fontFamily:"inherit",boxSizing:"border-box"}}/>
      </div>
      <div style={{background:"#fff",borderRadius:C.rLg,border:`1px solid ${C.b}`,boxShadow:C.sh,overflow:"hidden"}}>
        {loading?<div style={{padding:32,textAlign:"center",color:C.t3}}>Chargement…</div>:
        filtered.length===0?<div style={{padding:32,textAlign:"center",color:C.t3}}>Aucun log</div>:(
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead><tr style={{background:"#0D1B2A"}}>
                {["Date & Heure","Action","Détail","Utilisateur"].map(h=>(
                  <th key={h} style={{padding:"8px 14px",textAlign:"left",color:"#fff",fontWeight:600,fontSize:10,textTransform:"uppercase"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtered.map((l:any,i:number)=>{
                  const color=getColor(l.action||"");
                  return(
                    <tr key={i} style={{borderBottom:`1px solid ${C.b}`,background:i%2===0?"#fff":"#FAFBFD"}}>
                      <td style={{padding:"8px 14px",color:C.t3,whiteSpace:"nowrap",fontSize:10}}>{new Date(l.ts).toLocaleString("fr-FR")}</td>
                      <td style={{padding:"8px 14px"}}><span style={{background:color+"18",color:color,padding:"2px 8px",borderRadius:4,fontWeight:600,fontSize:10}}>{l.action||"—"}</span></td>
                      <td style={{padding:"8px 14px",color:C.t1,maxWidth:300,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.detail||"—"}</td>
                      <td style={{padding:"8px 14px",color:C.t3}}>{l.user||"—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
