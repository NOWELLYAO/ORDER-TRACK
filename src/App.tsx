// @ts-nocheck
import React, { useState, useEffect, Fragment, useRef } from "react";

// ── Activity log (defined early — used by multiple components) ────────────────
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
  }catch{}
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
    nav_dashboard:"Tableau de bord", nav_compilation:"Compilation", nav_clients:"Clients",
    nav_add_client:"Ajouter", nav_search:"Recherche globale",
    // General
    loading:"Chargement…", save:"Enregistrer", cancel:"Annuler", delete:"Supprimer",
    confirm_del_client:'Supprimer "{name}" et toutes ses données ?',
    confirm_del_order:"Supprimer cette commande ?",
    confirm_del_invoice:"Supprimer cette facture ?",
    confirm_del_payment:"Supprimer ce paiement ?",
    // Dashboard
    page_dashboard:"Tableau de bord", page_compilation:"Compilation",
    kpi_clients:"Clients", kpi_orders:"Commandes", kpi_po:"Total PO",
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
    open_label:"OPEN ORDERS", remain_to_invoice:"Reste à facturer",
    ranking_po:"Classement PO par client", monthly_activity:"Activité mensuelle {y}",
    // Client page
    order_management:"Gestion des commandes {y}",
    edit_client:"Modifier", no_orders_msg:"Aucune commande — utilisez le bouton + pour commencer.",
    add_first_order:"Aucune commande — cliquez sur « Nouvelle commande » pour commencer.",
    invoiced_label:"Facturé", remaining_label:"Reste", collected_label:"Encaissé",
    late_delivery:"{n} livraison{s} en retard", overdue_pay:"{n} paiement{s} à surveiller",
    kpi_total_po:"PO total", kpi_invoiced:"Facturé", kpi_collected:"Encaissé",
    kpi_overdue_client:"Factures échues", kpi_outstanding_client:"En cours (non échu)",
    kpi_open:"Open orders", commanded:"Commandé", late_label:"Facturé non réglé",
    outstanding_wait:"Factures en attente", remain_invoice:"Reste à facturer",
    // Tabs
    tab_orders:"Commandes", tab_invoices:"Factures", tab_payments:"Paiements",
    search_orders:"Chercher N° PO, S/O, statut…",
    search_invoices:"Chercher N° facture, PO…",
    search_payments:"Chercher réf. paiement, mode…",
    results:"{n} résultat{s}", no_results:"Aucune {type} trouvé{e}",
    show_more:"Afficher les {n} {type} suivant{s}", collapse:"Réduire",
    // Orders
    btn_new_order:"Nouvelle commande", btn_add_invoice:"Ajouter facture",
    col_po:"N° PO", col_so:"S/O", col_order_num:"N° Commande", col_date:"Date",
    col_amount:"Montant PO", col_invoiced_remain:"Facturé / Reste", col_collected:"Encaissé",
    col_delivery_mode:"Mode livraison", col_expected:"Date prévue",
    col_nb_invoices:"Nb factures", col_notes:"Notes",
    delay_days:"{n}j de retard", in_days:"Dans {n}j",
    invoice_section:"Expéditions & Factures", no_invoice_yet:"Aucune facture pour cette commande",
    // Invoices
    col_invoice:"N° Facture", col_due:"Échéance", col_paid:"Payé",
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
    order_date:"Date commande *", po_number:"N° PO Client *",
    so_number:"N° S/O *", order_number_cimelec:"N° Commande (CIMELEC)",
    amount:"Montant (€) *", delivery_mode:"Mode de livraison",
    expected_date:"Date livraison prévue", order_notes:"Notes",
    order_status_title:"Statut de la commande *",
    create_order:"Créer la commande", save_order:"Enregistrer",
    new_invoice:"Nouvelle expédition / Facture", edit_invoice:"Modifier la facture",
    invoice_number:"N° Facture *", invoice_date:"Date facture *",
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
    clients_included:"Clients inclus", all_clients:"Tous", no_clients:"Aucun",
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
    search_placeholder:"Rechercher un N° PO, S/O, facture, référence…",
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
    nav_dashboard:"Dashboard", nav_compilation:"Compilation", nav_clients:"Clients",
    nav_add_client:"Add", nav_search:"Global search",
    // General
    loading:"Loading…", save:"Save", cancel:"Cancel", delete:"Delete",
    confirm_del_client:'Delete "{name}" and all its data?',
    confirm_del_order:"Delete this order?",
    confirm_del_invoice:"Delete this invoice?",
    confirm_del_payment:"Delete this payment?",
    // Dashboard
    page_dashboard:"Dashboard", page_compilation:"Compilation",
    kpi_clients:"Clients", kpi_orders:"Orders", kpi_po:"Total PO",
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
    ranking:"Client ranking", rank_account:"Account #", rank_conditions:"Payment terms",
    rank_cmds:"Orders", rank_factor:"Inv. rate",
    // Compilation
    consol_view:"Consolidated view · all clients · {n} active accounts",
    total_po_year:"Total PO {y}", invoiced_total:"Invoiced", open_orders:"Open Orders",
    open_label:"OPEN ORDERS", remain_to_invoice:"Remaining to invoice",
    ranking_po:"PO ranking by client", monthly_activity:"Monthly activity {y}",
    // Client page
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
    client_name:"Client name *", account_num:"Account #",
    pay_terms:"Payment terms", custom_days:"Days",
    uppercase_note:"Name will be automatically uppercased.",
    auto_due:"Automatic due dates:", due_advance:"Payment tied to delivery.",
    due_immediate:"Cash payment — due on invoice date.",
    due_days:"Auto-calculated ({n} days after invoice date).",
    create_client:"Create client", save_changes:"Save changes",
    new_order:"New order", edit_order:"Edit order",
    order_date:"Order date *", po_number:"Client PO # *",
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
    r_summary:"Client summary", r_summary_desc:"Summary by client",
    date_from:"Start date", date_to:"End date",
    clients_included:"Clients included", all_clients:"All", no_clients:"None",
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

// ── Export to Excel utility ───────────────────────────────────────────────────
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

// ── Catalogue & Devis Supabase helpers ───────────────────────────────────────
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
  }catch(e){return null;}
};

const sbSet=async(key:string,payload:any):Promise<boolean>=>{
  try{
    const patch=await fetch(CAT_B+"/rest/v1/ordertrack_data?apikey="+CAT_K+"&user_key=eq."+key,{
      method:"PATCH",
      headers:{"Content-Type":"application/json","apikey":CAT_K,"Authorization":"Bearer "+CAT_K,"Prefer":"count=exact,return=minimal"},
      body:JSON.stringify({payload,updated_at:new Date().toISOString()})
    });
    const count=patch.headers.get("Content-Range");
    const updated=count&&!count.includes("*/0");
    if(patch.ok&&updated)return true;
    const post=await fetch(CAT_B+"/rest/v1/ordertrack_data?apikey="+CAT_K,{
      method:"POST",
      headers:{"Content-Type":"application/json","apikey":CAT_K,"Authorization":"Bearer "+CAT_K,"Prefer":"return=minimal"},
      body:JSON.stringify({user_key:key,payload})
    });
    return post.ok||post.status===201||post.status===204;
  }catch{return false;}
};

const AVAIL_OPTIONS=["Stock","2-4 weeks EXW","4-6 weeks EXW","6-8 weeks EXW","8-10 weeks EXW","10-12 weeks EXW","12-14 weeks EXW","14-18 weeks EXW","18-24 weeks EXW","24-28 weeks EXW"];

// ── Catalogue localStorage cache ──────────────────────────────────────────────
const CAT_LS_KEY="ordertrack_catalogue_cache";
const QUOT_LS_KEY="ordertrack_quotes_cache";
const saveCatLocal=(p:any[])=>{const ts=new Date().toISOString();try{localStorage.setItem(CAT_LS_KEY,JSON.stringify(p));localStorage.setItem(CAT_LS_KEY+"_ts",ts);}catch{}};
const loadCatLocal=():{data:any[]|null,ts:string}=>{try{const d=localStorage.getItem(CAT_LS_KEY);const ts=localStorage.getItem(CAT_LS_KEY+"_ts")||"";return{data:d?JSON.parse(d):null,ts};}catch{return{data:null,ts:""};}};
const saveQuotLocal=(q:any[])=>{try{localStorage.setItem(QUOT_LS_KEY,JSON.stringify(q));}catch{}};
const loadQuotLocal=():{data:any[]|null,ts:string}=>{try{const d=localStorage.getItem(QUOT_LS_KEY);return{data:d?JSON.parse(d):null,ts:""};}catch{return{data:null,ts:""};}};

// ── Excel parser & column detection ──────────────────────────────────────────
const parseExcel=async(file:File):Promise<any[]>=>{
  return new Promise((resolve)=>{
    const reader=new FileReader();
    reader.onload=async(e)=>{
      try{
        if(!(window as any).XLSX){
          await new Promise<void>((res,rej)=>{const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";s.onload=()=>res();s.onerror=()=>rej();document.head.appendChild(s);});
        }
        const XLSX=(window as any).XLSX;
        const data=new Uint8Array(e.target?.result as ArrayBuffer);
        const wb=XLSX.read(data,{type:"array"});
        const ws=wb.Sheets[wb.SheetNames[0]];
        const rows:any[]=XLSX.utils.sheet_to_json(ws,{header:1,defval:""});
        resolve(rows);
      }catch{resolve([]);}
    };
    reader.readAsArrayBuffer(file);
  });
};

const frMonthToISO=(label:string):string=>{
  const M:Record<string,string>={janvier:"01",fevrier:"02","février":"02",mars:"03",avril:"04",mai:"05",juin:"06",juillet:"07",aout:"08","août":"08",septembre:"09",octobre:"10",novembre:"11",decembre:"12","décembre":"12"};
  const l=label.toLowerCase().trim();
  for(const[m,n] of Object.entries(M)){
    if(l.includes(m)){const y=l.match(/20\d{2}/);return(y?y[0]:new Date().getFullYear().toString())+"-"+n+"-01";}
  }
  return new Date().toISOString().slice(0,10);
};

const isPeriodLabel=(row:any[]):string|null=>{
  for(const cell of row){const s=String(cell||"").trim();if(/^(JANVIER|FEVRIER|FÉVRIER|MARS|AVRIL|MAI|JUIN|JUILLET|AOUT|AOÛT|SEPTEMBRE|OCTOBRE|NOVEMBRE|DECEMBRE|DÉCEMBRE)\s+20\d{2}$/i.test(s))return s;}
  return null;
};

const detectColumns=(headers:string[])=>{
  const h=headers.map((x:any)=>String(x||"").toLowerCase().trim());
  const find=(...keys:string[])=>{for(const k of keys){const i=h.findIndex((x:string)=>x.includes(k));if(i>=0)return i;}return -1;};
  return{
    pn:find("pn","pn ","part number","p/n","part no","référence","reference","ref","sku","code article"),
    desc:find("désignation","designation","product","description","libellé","produit","name","nom","article"),
    price:find("up (€)","up (eur)","p.u. (eur)","p.u.","p.u","up","unit price","prix unitaire","price","prix","tarif"),
    qty:find("qty","qté","quantité","quantite","stock","quantity"),
    customer:find("customer","client","compte"),
    avail:find("avail","dispo","lead","délai","delai"),
  };
};

const findHeaderRow=(rows:any[][]):{headerIdx:number,colMap:any}=>{
  let bestScore=-1,bestIdx=0;
  for(let i=0;i<Math.min(20,rows.length);i++){
    const row=rows[i];
    if(!row.some((x:any)=>x!==null&&x!==undefined&&x!==""))continue;
    const h=row.map((x:any)=>String(x||"").toLowerCase().trim());
    let score=0;
    if(h.some((s:string)=>s==="pn"||s==="part number"||s==="p/n"||s==="référence"))score+=3;
    if(h.some((s:string)=>s.includes("up")||s==="price"||s==="prix"||s==="tarif"))score+=3;
    if(h.some((s:string)=>s.includes("description")||s==="product"||s.includes("désign")))score+=2;
    if(h.some((s:string)=>s.includes("qty")||s.includes("quantit")))score+=1;
    const numCount=row.filter((x:any)=>typeof x==="number").length;
    if(numCount>row.length/2)score-=3;
    if(score>bestScore){bestScore=score;bestIdx=i;}
  }
  if(bestScore>=2)return{headerIdx:bestIdx,colMap:detectColumns(rows[bestIdx].map((x:any)=>String(x||"")))};
  for(let i=0;i<Math.min(5,rows.length);i++){if(rows[i].some((x:any)=>x!==null&&x!==undefined&&x!==""))return{headerIdx:i,colMap:detectColumns(rows[i].map((x:any)=>String(x||"")))};}
  return{headerIdx:0,colMap:{pn:-1,desc:-1,price:-1,qty:-1,customer:-1,avail:-1}};
};

const extractCustomer=(rows:any[][],headerIdx:number):string=>{
  for(let i=0;i<headerIdx;i++){for(const cell of rows[i]){const s=String(cell||"").trim();if(s.length>3&&!s.includes("=")){const m=s.match(/^([A-Z][A-Z\s]+)/);if(m&&m[1].trim().length>2)return m[1].trim();}}}
  return "";
};

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

const DEFAULT_PERMS={canEdit:true,canDelete:true,canAddClient:true,canViewReports:true,canExport:true};

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
      const r=await fetch(B+"/rest/v1/ordertrack_data?apikey="+K+"&user_key=eq."+USERS_DB_KEY,{
        method:"PATCH",headers:{"Content-Type":"application/json","apikey":K,"Authorization":"Bearer "+K,"Prefer":"return=minimal"},
        body:JSON.stringify({payload:{users:updated}})
      });
      if(r.status===404||!r.ok){
        await fetch(B+"/rest/v1/ordertrack_data?apikey="+K,{
          method:"POST",headers:{"Content-Type":"application/json","apikey":K,"Authorization":"Bearer "+K,"Prefer":"resolution=merge-duplicates,return=minimal"},
          body:JSON.stringify({user_key:USERS_DB_KEY,payload:{users:updated}})
        });
      }
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
    {key:"canAddClient",label:"Ajouter / supprimer des clients",icon:"ti-user-plus"},
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
  const[clients,setClients]=useState<string[]|null>(null);
  const[session,setSession]=useState<any>(()=>{
    try{const s=localStorage.getItem(AUTH_KEY);return s?JSON.parse(s):null;}catch{return null;}
  });
  const[showUserMgr,setShowUserMgr]=useState(false);
  const[sessionTimeout,setSessionTimeout]=useState<any>(null);
  const SESSION_DURATION=30*60*1000; // 30 minutes
  const logout=()=>{localStorage.removeItem(AUTH_KEY);setSession(null);if(sessionTimeout)clearTimeout(sessionTimeout);};

  // Session expiration
  const timerRef=React.useRef<any>(null);
  const resetSessionTimer=React.useCallback(()=>{
    if(timerRef.current)clearTimeout(timerRef.current);
    timerRef.current=setTimeout(()=>{
      alert("Votre session a expiré après 30 minutes d'inactivité.");
      localStorage.removeItem(AUTH_KEY);
      setSession(null);
    },SESSION_DURATION);
  },[]);

  useEffect(()=>{
    if(!session)return;
    const events=["mousedown","keydown","touchstart","scroll"];
    events.forEach(e=>window.addEventListener(e,resetSessionTimer,{passive:true}));
    resetSessionTimer();
    return()=>{events.forEach(e=>window.removeEventListener(e,resetSessionTimer));if(sessionTimeout)clearTimeout(sessionTimeout);};
  },[session]);
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
  const[isOnline,setIsOnline]=useState(navigator.onLine);
  useEffect(()=>{
    const goOn=()=>setIsOnline(true);const goOff=()=>setIsOnline(false);
    window.addEventListener("online",goOn);window.addEventListener("offline",goOff);
    return()=>{window.removeEventListener("online",goOn);window.removeEventListener("offline",goOff);};
  },[]);

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
            setClients(localParsed.clients||DEFAULT_CLIENTS);
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
            setClients(cloud.clients||DEFAULT_CLIENTS);
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
          setClients(p.clients||DEFAULT_CLIENTS);
          setData(migrateRDT(p.orders||{}));
          setConfigs(p.configs||migrateAccounts(p.accounts));
          setSyncStatus("offline");
          return;
        }
      }catch{}
      // 3. Fresh start
      const init:any={};DEFAULT_CLIENTS.forEach(c=>(init[c]=[]));
      setClients(DEFAULT_CLIENTS);setData(init);
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
        setClients(c=>JSON.stringify(c)===JSON.stringify(cloud.clients)?c:(cloud.clients||DEFAULT_CLIENTS));
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
          sendNotif("OrderTrack — Mise à jour",`Nouvelles données synchronisées à ${t}`);
        }
      }catch(e){console.warn("[Poll]",e);}
    },15000);
    return()=>clearInterval(interval);
  },[]);

  const persist=(nc:any,nd:any,nf:any)=>{
    const c=nc??clients,d=nd??data,f=nf??configs;
    setClients(c);setData(d);setConfigs(f);
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
  const addClient=(name:string,cfg:any)=>{const t=name.trim().toUpperCase();if(!t||clients!.includes(t))return false;persist([...clients!,t],{...data,[t]:[]},{...configs,[t]:cfg});return true;};
  const editClient=(old:string,name:string,cfg:any)=>{const t=name.trim().toUpperCase();if(!t)return false;if(t!==old&&clients!.includes(t))return false;const nc=clients!.map(c=>c===old?t:c);const nd={...data};nd[t]=nd[old]||[];if(t!==old)delete nd[old];const nf={...configs,[t]:cfg};if(t!==old)delete nf[old];if(page===old)setPage(t);persist(nc,nd,nf);return true;};
  const delClient=(name:string)=>{const nc=clients!.filter(c=>c!==name);const nd={...data};delete nd[name];const nf={...configs};delete nf[name];if(page===name)setPage("kpi");persist(nc,nd,nf);};

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
              <p style={{fontSize:10,color:"#374151",fontWeight:600,letterSpacing:".07em",textTransform:"uppercase",margin:0}}>Clients</p>
              <button onClick={()=>setModal({type:"client"})} style={{display:"flex",alignItems:"center",gap:4,background:"rgba(99,102,241,.2)",border:"none",color:"#A5B4FC",cursor:"pointer",borderRadius:5,padding:"3px 7px",fontSize:11,fontWeight:500}}>
                <i className="ti ti-plus" style={{fontSize:12}} aria-hidden="true"/> Ajouter
              </button>
            </div>
          )}
          {!sideOpen&&<div style={{height:12}}/>}

          {clients.map(c=>(
            <SClientBtn key={c} label={c} active={page===c} open={sideOpen}
              onClick={()=>{setPage(c);if(isMobile)setMobileMenuOpen(false);}}
              onEdit={()=>setModal({type:"client",name:c,cfg:getConfig(c)})}
              onDelete={()=>{if(window.confirm(c+(lang==="en"?" — delete all data?":" — supprimer toutes les données ?")))delClient(c);}}
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
                {session?.role==="admin"&&<button onClick={()=>setPage("logs")} title="Logs d'activité" style={{background:"transparent",border:"none",color:"#6B7280",cursor:"pointer",padding:4,borderRadius:4,display:"flex"}}><i className="ti ti-activity" style={{fontSize:14}} aria-hidden="true"/></button>}
                <button onClick={notifEnabled?()=>{}: enableNotifications} title={notifEnabled?"Notifications activées":"Activer les notifications"}
                  style={{background:"transparent",border:"none",color:notifEnabled?"#10B981":"#6B7280",cursor:"pointer",padding:4,borderRadius:4,display:"flex"}}>
                  <i className={`ti ${notifEnabled?"ti-bell-ringing":"ti-bell"}`} style={{fontSize:14}} aria-hidden="true"/>
                </button>
                <button onClick={logout} title="Se déconnecter" style={{background:"transparent",border:"none",color:"#6B7280",cursor:"pointer",padding:4,borderRadius:4,display:"flex"}}><i className="ti ti-logout" style={{fontSize:14}} aria-hidden="true"/></button>
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
                  setClients(cloud.clients||DEFAULT_CLIENTS);
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
          <div style={{background:"#1D4ED8",padding:"8px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
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
          <ClientPage client={page} cfg={getConfig(page)} orders={getOrders(page)} stats={getStats(page)}
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
            onEditClient={()=>setModal({type:"client",name:page,cfg:getConfig(page)})}
            onDelClient={()=>{if(window.confirm(`${t(lang,"confirm_del_client",{name:page})}`))delClient(page);}}
          />
        )}
        </main>
      </div>

      {/* ── MODALS ──────────────────────────────────────────── */}
      {modal&&(
        <div style={{position:"absolute",inset:0,background:"rgba(15,23,42,.55)",display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",zIndex:100,backdropFilter:"blur(2px)"}} onClick={(e:any)=>{if(e.target===e.currentTarget)setModal(null);}}>
          {modal.type==="client"&&<ClientModal name={modal.name} cfg={modal.cfg} lang={lang} onSave={(n:string,c:any)=>{const ok=modal.name?editClient(modal.name,n,c):addClient(n,c);if(ok)setModal(null);else alert(lang==="en"?"Invalid or duplicate name.":"Nom invalide ou déjà utilisé.");}} onClose={()=>setModal(null)}/>}
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
                {["Client","N° PO","N° Facture","Date émission","Échéance","Retard","Montant","Payé","Reste dû"].map((h,i)=>(
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
                <td colSpan={8} style={{padding:"10px 14px",textAlign:"right",fontWeight:700,color:C.redDk,fontSize:13}}>TOTAL ÉCHU À RECOUVRER</td>
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
              {["#","Client","N° Compte","Conditions paiement","Cmds","PO","Facturé","Encaissé","Factures en cours","Open Orders","Tx Fact."].map((h,i)=>(
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
          <div style={{fontSize:11,color:C.t3,marginTop:4}}>Reste à facturer</div>
        </div>
        <div style={{background:`linear-gradient(135deg,${C.blue},${C.purple})`,borderRadius:C.rLg,boxShadow:C.shMd,padding:"18px 20px",display:"flex",flexDirection:"column",justifyContent:"center"}}>
          <div style={{fontSize:10,color:"rgba(255,255,255,.7)",fontWeight:600,textTransform:"uppercase",letterSpacing:".06em",marginBottom:8}}>Taux global</div>
          <div style={{fontSize:22,fontWeight:800,color:"#fff",letterSpacing:"-.02em"}}>{txFact.toFixed(1)}%</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,.7)",marginTop:4}}>Facturation / Encaiss. {txPay.toFixed(1)}%</div>
        </div>
      </div>

      {/* ── CLIENT BARS + MONTHLY TABLE split layout ── */}
      <div style={{display:"grid",gridTemplateColumns:"380px 1fr",gap:16,alignItems:"start"}}>

        {/* Left — Client ranking bars */}
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
                  <th style={{padding:"10px 16px",textAlign:"left",color:C.t3,fontWeight:600,fontSize:10,textTransform:"uppercase",letterSpacing:".05em",whiteSpace:"nowrap",borderBottom:`1px solid ${C.b}`}}>Client</th>
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
function ClientPage({client,cfg,orders,stats,onAdd,onEditOrder,onDelOrder,onAddInv,onEditInv,onDelInv,onAddPay,onEditPay,onDelPay,onEditClient,onDelClient,focusOrderId,onClearFocus,lang="fr",isMobile=false,onSaveOrder}:any){
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
          <Btn icon="ti-edit" label="Modifier" onClick={onEditClient} variant="ghost"/>
          <Btn icon="ti-trash" label="Supprimer" onClick={onDelClient} variant="danger"/>
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
            <Kpi icon="ti-clock"           label="Open orders"        val={`${fmtK(stats.openOrders)} €`} sub="Reste à facturer"                            c={C.purple} bg={C.purpleL}/>
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
function SClientBtn({label,active,open,onClick,onEdit,onDelete}:any){
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

function ClientModal({name,cfg,onSave,onClose,lang="fr"}:any){
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
      footer={<><button onClick={onClose}>{tr("cancel")}</button><Btn icon="ti-check" label={order?tr("save_order"):tr("create_order")} onClick={()=>{if(!f.poNumber||!f.amount){alert("N° PO et montant requis");return;}onSave(f);}} variant="primary"/></>}>
      {/* Infos de base */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        <Fld label="Date commande *" type="date" value={f.date} onChange={(v:any)=>s("date",v)}/>
        <Fld label="N° PO Client *" value={f.poNumber} onChange={(v:any)=>s("poNumber",v)} placeholder="ex: T526.2026"/>
        <Fld label="N° S/O *" value={f.soNumber} onChange={(v:any)=>s("soNumber",v)} placeholder="ex: 14560128"/>
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
      footer={<><button onClick={onClose}>{tr("cancel")}</button><Btn icon="ti-check" label={invoice?tr("save_invoice"):tr("create_invoice")} onClick={()=>{if(!f.invoiceNumber||!f.amount){alert("N° Facture et montant requis");return;}const dd=f.overrideDueDate?f.dueDate:autoDate(f.date);onSave({...f,dueDate:dd});}} variant="primary"/></>}>
      <div style={{display:"flex",gap:14,background:C.blueL,borderRadius:C.rSm,padding:"10px 14px",marginBottom:16,fontSize:12}}>
        <span style={{color:C.blueDk}}>PO : <strong>{fmt(order.amount)} €</strong></span>
        <span style={{color:C.teal}}>Déjà facturé : <strong>{fmt(already)} €</strong></span>
        <span style={{color:C.amberDk}}>Reste : <strong>{fmt(remaining)} €</strong></span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Fld label="N° Facture *" value={f.invoiceNumber} onChange={(v:any)=>s("invoiceNumber",v)} placeholder="ex: INV-2026-001"/>
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
                  {["N° Facture","PO","Date","Montant","Payé","Reste","Échéance","Statut","Actions"].map((h,i)=>(
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
                  {["Date","N° PO","N° Facture","Montant","Mode","Référence","Notes","Actions"].map((h,i)=>(
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

// ─── ORDER CARD (extracted from ClientPage) ───────────────────────────────────
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
          <div><div style={{fontSize:10,color:C.t3,marginBottom:2,textTransform:"uppercase",letterSpacing:".04em"}}>N° PO</div><div style={{fontWeight:700,fontSize:13,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{order.poNumber||"—"}</div></div>
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
                      <div><div style={{fontSize:10,color:C.t3,marginBottom:2,textTransform:"uppercase",letterSpacing:".04em"}}>N° Facture</div><div style={{fontWeight:700,fontSize:13,color:C.purple}}>{inv.invoiceNumber||"—"}</div></div>
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
          <div key={idx} style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"120px 1fr 2fr 80px 32px",gap:8,alignItems:"center"}}>
            <select value={item.priority} onChange={e=>onUpdate(idx,"priority",e.target.value)}
              style={{padding:"6px 8px",borderRadius:5,border:`1px solid ${C.b}`,fontSize:11,fontWeight:600,
                background:item.priority==="HIGH"?C.redL:item.priority==="MEDIUM"?C.amberL:C.greenL,
                color:item.priority==="HIGH"?C.redDk:item.priority==="MEDIUM"?C.amberDk:C.greenDk}}>
              {PRIORITIES_LIST.map(p=><option key={p} value={p}>{p}</option>)}
            </select>
            <input value={item.client} onChange={e=>onUpdate(idx,"client",e.target.value)}
              placeholder="Client / Prospect"
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
  const [showPreview,setShowPreview]=useState(false);
  const [orderPeriod,setOrderPeriod]=useState(7);
  const [invoicePeriod,setInvoicePeriod]=useState(30);
  const [savedReports,setSavedReports]=useState<any[]>(()=>{try{const r=localStorage.getItem(REPORT_KEY);return r?JSON.parse(r):[];}catch{return [];}});
  const [showHistory,setShowHistory]=useState(false);
  const [saveMsg,setSaveMsg]=useState("");

  // Auto-save draft on every change
  useEffect(()=>{
    const draft={weekLabel,period,lastWeekItems,thisWeekItems,expectedOrders};
    try{localStorage.setItem(DRAFT_KEY,JSON.stringify(draft));}catch{}
  },[weekLabel,period,lastWeekItems,thisWeekItems,expectedOrders]);

  const saveReport=async()=>{
    const report={
      id:Date.now().toString(),
      weekLabel,period,orderPeriod,invoicePeriod,
      lastWeekItems,thisWeekItems,expectedOrders,
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
  const invByClient:Record<string,number>={};
  [...invoicesThisMonth,...invoicesPrevMonth].forEach((i:any)=>{
    invByClient[i._client]=(invByClient[i._client]||0)+(+i.amount||0);
  });



  const MONTH_NAMES=["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

  // ── Print function ─────────────────────────────────────────────────────────
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
      <div class="cover-badge">Semaine ${weekLabel}</div>
    </div>
    <div class="cover-toc">
      <div class="toc-item"><span class="toc-num">1</span><span class="toc-label">Order Intake<br><small style="opacity:.6">Commandes reçues</small></span></div>
      <div class="toc-item"><span class="toc-num">2</span><span class="toc-label">Invoicing<br><small style="opacity:.6">Facturation mensuelle</small></span></div>
      <div class="toc-item"><span class="toc-num">3</span><span class="toc-label">Last Week<br><small style="opacity:.6">Activités semaine passée</small></span></div>
      <div class="toc-item"><span class="toc-num">4</span><span class="toc-label">This Week<br><small style="opacity:.6">Activités semaine en cours</small></span></div>
    </div>
  </div>
  <div class="footer">
    <span>CONFIDENTIEL — Usage interne</span>
    <span>Généré le ${today.toLocaleDateString("fr-FR",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</span>
  </div>
</div>

<!-- ══ PAGE 2: ORDER INTAKE ══ -->
<div class="page">
  <div class="section-header">
    <div>
      <div style="font-size:10px;color:#2563EB;font-weight:600;letter-spacing:.08em;text-transform:uppercase;margin-bottom:4px">1 / 4</div>
      <div class="section-title">📦 ORDER INTAKE</div>
      <div class="section-sub">— ${period} · Commandes reçues sur ${periodLabel}</div>
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
      <div class="kpi-sub">${recentOrders.length} commande${recentOrders.length>1?"s":""} sur ${periodLabel}</div>
    </div>
    <div class="kpi" style="border-left:4px solid #D97706">
      <div class="kpi-label">Expected Orders</div>
      <div class="kpi-val" style="color:#D97706">${fmtK(expectedInvoicing)} €</div>
      <div class="kpi-sub">Commandes attendues</div>
    </div>
    <div class="kpi" style="border-left:4px solid #059669">
      <div class="kpi-label">Total ${year} (YTD)</div>
      <div class="kpi-val" style="color:#059669">${fmtK(allOrders.reduce((s:number,o:any)=>{const d=o.date?new Date(o.date+"T00:00:00"):null;return d&&d.getFullYear()===thisYear?s+(+o.amount||0):s;},0))} €</div>
      <div class="kpi-sub">Depuis le 1er janvier ${year}</div>
    </div>
  </div>

  <div class="two-col">
    <div>
      <div class="col-header">📦 ORDERS RECEIVED — ${period}</div>
      <table>
        <thead><tr><th>Customer</th><th>S/O Number</th><th style="text-align:right">Amount (K€)</th></tr></thead>
        <tbody>
          ${recentOrders.length===0
            ?'<tr><td colspan="3" style="text-align:center;color:#8FA0B3;padding:16px">Aucune commande cette semaine</td></tr>'
            :recentOrders.map((o:any)=>`<tr><td style="font-weight:600">${o._client}</td><td style="font-family:monospace;font-size:9px">${o.soNumber||"—"}</td><td style="text-align:right;font-weight:600;color:#2563EB">${fmtK(+o.amount||0)}</td></tr>`).join("")
          }
          <tr class="total-row"><td colspan="2">TOTAL</td><td style="text-align:right">${fmtK(recentOrdersAmt)}</td></tr>
        </tbody>
      </table>
    </div>
    <div>
      <div class="col-header">🎯 EXPECTED ORDERS</div>
      <table>
        <thead><tr><th>Client</th><th>Project</th><th style="text-align:right">Est. (K€)</th></tr></thead>
        <tbody>
          ${expectedOrders.filter((e:any)=>e.client||e.project).length===0
            ?'<tr><td colspan="3" style="text-align:center;color:#8FA0B3;padding:16px">— à compléter —</td></tr>'
            :expectedOrders.filter((e:any)=>e.client||e.project).map((e:any)=>`<tr><td style="font-weight:600">${e.client||"—"}</td><td>${e.project||"—"}</td><td style="text-align:right;font-weight:600;color:#D97706">${e.est?fmtK(+e.est*1000):"—"}</td></tr>`).join("")
          }
        </tbody>
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
      <div class="section-title">🧾 MONTHLY INVOICING</div>
      <div class="section-sub">— ${prevMonthName} / ${thisMonthName} ${year}</div>
    </div>
    <div class="section-meta">
      <div class="section-badge" style="background:#CCFBF1;color:#0D9488">${weekLabel} · ${period}</div>
    </div>
  </div>

  <div class="kpi-row">
    <div class="kpi" style="border-left:4px solid #0D9488">
      <div class="kpi-label">Already Invoiced in ${year}</div>
      <div class="kpi-val" style="color:#0D9488">${fmtK(ytdInvoiced)} €</div>
      <div class="kpi-sub">Depuis le 1er janvier</div>
    </div>
    <div class="kpi" style="border-left:4px solid #D97706">
      <div class="kpi-label">Expected Invoicing</div>
      <div class="kpi-val" style="color:#D97706">${fmtK(expectedInvoicing)} €</div>
      <div class="kpi-sub">Open orders à facturer</div>
    </div>
    <div class="kpi" style="border-left:4px solid #7C3AED">
      <div class="kpi-label">Open Orders</div>
      <div class="kpi-val" style="color:#7C3AED">${fmtK(openOrders)} €</div>
      <div class="kpi-sub">Reste à facturer</div>
    </div>
  </div>

  <div class="two-col">
    <div>
      <div class="col-header">✅ INVOICED — ${prevMonthName.toUpperCase()} / ${thisMonthName.toUpperCase()}</div>
      <table>
        <thead><tr><th>Customer</th><th>S/O</th><th style="text-align:right">Amount (K€)</th></tr></thead>
        <tbody>
          ${[...invoicesThisMonth,...invoicesPrevMonth].length===0
            ?'<tr><td colspan="3" style="text-align:center;color:#8FA0B3;padding:16px">Aucune facture sur la période</td></tr>'
            :(() => {
              const byClient2:Record<string,any[]>={};
              [...invoicesThisMonth,...invoicesPrevMonth].forEach((i:any)=>{
                if(!byClient2[i._client])byClient2[i._client]=[];
                byClient2[i._client].push(i);
              });
              let rows2="";
              Object.keys(byClient2).forEach(c=>{
                const tot=byClient2[c].reduce((s:number,i:any)=>s+(+i.amount||0),0);
                rows2+=`<tr><td style="font-weight:700">${c}</td><td style="font-family:monospace;font-size:9px">${byClient2[c].map((i:any)=>i._po||i.invoiceNumber).slice(0,2).join(", ")}</td><td style="text-align:right;font-weight:600;color:#0D9488">${fmtK(tot)}</td></tr>`;
              });
              const gt=[...invoicesThisMonth,...invoicesPrevMonth].reduce((s:number,i:any)=>s+(+i.amount||0),0);
              rows2+=`<tr class="total-row"><td colspan="2">TOTAL</td><td style="text-align:right">${fmtK(gt)}</td></tr>`;
              return rows2;
            })()
          }
        </tbody>
      </table>
    </div>
    <div>
      <div class="col-header">📅 EXPECTED INVOICING — ${thisMonthName.toUpperCase()}/${MONTH_NAMES[thisMonth===11?0:thisMonth+1].toUpperCase()}</div>
      <table>
        <thead><tr><th>Customer</th><th>S/O</th><th style="text-align:right">Amount (K€)</th></tr></thead>
        <tbody>
          ${(()=>{
            const expInvRows=allOrders.filter((o:any)=>o.status!=="annule"&&o.status!=="livree").slice(0,8);
            if(expInvRows.length===0) return '<tr><td colspan="3" style="text-align:center;color:#8FA0B3;padding:16px">— à compléter —</td></tr>';
            let r="";
            const byC:Record<string,number>={};
            expInvRows.forEach((o:any)=>{const inv=(o.invoices||[]).reduce((s:number,i:any)=>s+(+i.amount||0),0);const rem=Math.max(0,(+o.amount||0)-inv);if(rem>0)byC[o._client]=(byC[o._client]||0)+rem;});
            Object.keys(byC).forEach(c=>{r+=`<tr><td style="font-weight:600">${c}</td><td></td><td style="text-align:right;font-weight:600;color:#D97706">${fmtK(byC[c])}</td></tr>`;});
            r+=`<tr class="total-row"><td colspan="2">TOTAL</td><td style="text-align:right">${fmtK(Object.values(byC).reduce((s:number,v:any)=>s+v,0))}</td></tr>`;
            return r;
          })()}
        </tbody>
      </table>
    </div>
  </div>

  <div class="footer">
    <span>Monthly Invoicing — ${weekLabel} · ${period}</span>
    <span>2 / 4</span>
  </div>
</div>

<!-- ══ PAGE 4: LAST WEEK ══ -->
<div class="page">
  <div class="section-header">
    <div>
      <div style="font-size:10px;color:#7C3AED;font-weight:600;letter-spacing:.08em;text-transform:uppercase;margin-bottom:4px">3 / 4</div>
      <div class="section-title">📋 LAST WEEK — Field Activity</div>
      <div class="section-sub">Activités de la semaine passée</div>
    </div>
    <div class="section-meta">
      <div class="section-badge" style="background:#EDE9FE;color:#7C3AED">${weekLabel} · ${period}</div>
    </div>
  </div>
  <div>
    ${lastWeekItems.filter((item:any)=>item.client||item.action).length===0
      ?'<div style="text-align:center;padding:40px;color:#8FA0B3">Aucune activité saisie pour la semaine passée</div>'
      :lastWeekItems.filter((item:any)=>item.client||item.action).map((item:any)=>`
        <div class="activity-row">
          <span class="priority-badge" style="background:${priorityBg(item.priority)};color:${priorityColor(item.priority)}">${item.priority}</span>
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
      <div class="section-title">🚀 THIS WEEK — Field Activity</div>
      <div class="section-sub">Activités de la semaine en cours</div>
    </div>
    <div class="section-meta">
      <div class="section-badge" style="background:#D1FAE5;color:#059669">${weekLabel} · ${period}</div>
    </div>
  </div>
  <div>
    ${thisWeekItems.filter((item:any)=>item.client||item.action).length===0
      ?'<div style="text-align:center;padding:40px;color:#8FA0B3">Aucune activité saisie pour la semaine en cours</div>'
      :thisWeekItems.filter((item:any)=>item.client||item.action).map((item:any)=>`
        <div class="activity-row">
          <span class="priority-badge" style="background:${priorityBg(item.priority)};color:${priorityColor(item.priority)}">${item.priority}</span>
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

<script>setTimeout(()=>window.print(),500);</script>
</body></html>`);
    w.document.close();
  };

  const generateDraftQuote=async()=>{
    const effectiveClient=useManualClient?qClientManual:qClient;
    if(!effectiveClient){alert("Sélectionnez ou saisissez un client");return;}
    if(!qLines.some((l:any)=>l.pn&&l.unitPrice>0)){alert("Ajoutez au moins une ligne avec PN et prix");return;}
    const validLines=qLines.filter((l:any)=>l.pn);
    const w=window.open("","_blank","width=900,height=700");
    if(!w)return;
    const dateStr=new Date(qDate).toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric"});
    const totStr=totalHT.toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2});
    const addrHtml=(useManualClient&&qClientAddr)
      ?'<div style="font-size:11px;color:#444;margin-top:3px">'+qClientAddr.split("\n").join("<br/>")+"</div>"
      :"";
    const linesHtml=validLines.map((l:any)=>[
      "<tr>",
      '<td style="padding:6px 10px;border:1px solid #c8e6c9;font-size:11px">'+l.pn+"</td>",
      '<td style="padding:6px 10px;border:1px solid #c8e6c9;font-size:11px">'+(l.desc||"—")+"</td>",
      '<td style="padding:6px 10px;border:1px solid #c8e6c9;font-size:11px;text-align:right">'+(+l.unitPrice||0).toLocaleString("fr-FR",{minimumFractionDigits:2})+"</td>",
      '<td style="padding:6px 10px;border:1px solid #c8e6c9;font-size:11px;text-align:center">'+l.qty+"</td>",
      '<td style="padding:6px 10px;border:1px solid #c8e6c9;font-size:11px;text-align:right">'+((+l.qty||0)*(+l.unitPrice||0)).toLocaleString("fr-FR",{minimumFractionDigits:2})+"</td>",
      '<td style="padding:6px 10px;border:1px solid #c8e6c9;font-size:11px;color:#6B7280">'+(l.avail||"")+"</td>",
      "</tr>"
    ].join("")).join("");
    const th=(txt:string,align:string="left",w:string="")=>
      '<th style="padding:7px 10px;border:1px solid #81c784;font-size:11px;text-align:'+align+';font-weight:bold'+(w?";width:"+w:"")+'">'+txt+"</th>";
    const parts=[
      "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Draft</title>",
      "<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;padding:15mm}",
      "@page{size:A4;margin:15mm}@media print{body{padding:0}}",
      ".ttl{font-size:16px;font-weight:bold;border:2px solid #000;padding:6px 20px;display:inline-block}</style></head><body>",
      "<table style='width:100%;margin-bottom:8px'><tr>",
      "<td style='width:40%'></td>",
      "<td style='text-align:center;width:20%'><span class='ttl'>DRAFT QUOTE</span></td>",
      "<td style='text-align:right;width:40%;font-size:11px'>"+dateStr+"</td></tr></table>",
      "<table style='width:100%;margin-bottom:16px'><tr>",
      "<td style='width:50%'><div style='font-weight:bold;font-size:13px'>"+effectiveClient+"</div>",
      addrHtml,
      "<div style='font-size:11px;margin-top:4px'>PROJECT : "+(qNotes||"")+"</div></td>",
      "<td style='text-align:right'><div style='font-size:16px;font-weight:bold'>GRUNDFOS</div></td></tr></table>",
      "<table style='width:100%;border-collapse:collapse'>",
      "<thead><tr style='background:#a5d6a7'>",
      th("p/n","left","100px"),th("Product"),th("UNIT PRICE","right","110px"),
      th("Qty","center","60px"),th("Total (€)","right","110px"),th("Availability","left","130px"),
      "</tr></thead><tbody>"+linesHtml+"</tbody>",
      "<tfoot><tr>",
      "<td colspan='4' style='padding:8px 10px;text-align:right;font-weight:bold'>TOT=</td>",
      "<td style='padding:8px 10px;text-align:right;font-weight:bold;font-size:13px;border-top:2px solid #000'>"+totStr+"</td>",
      "<td></td></tr></tfoot></table>",
      qValidity?"<div style='margin-top:20px;font-size:10px;color:#666'>Valable "+qValidity+" jours.</div>":"",
      "<scr"+"ipt>setTimeout(function(){window.print();},400);</scr"+"ipt>",
      "</body></html>"
    ];
    w.document.write(parts.join("\n"));
    w.document.close();
  };

  const generateQuote=async()=>{
    const effectiveClient=useManualClient?qClientManual:qClient;
    if(!effectiveClient){alert("Sélectionnez ou saisissez un client");return;}
    if(!qLines.some((l:any)=>l.pn&&l.unitPrice>0)){alert("Ajoutez au moins une ligne avec PN et prix");return;}
    // Save quote
    const quote={
      id:Date.now().toString(),number:qRef,client:effectiveClient,date:qDate,
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
  <!-- Client -->
  <div style="margin-bottom:24px">
    <div style="font-size:10px;font-weight:600;color:#6B7280;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Destinataire</div>
    <div style="font-size:14px;font-weight:700;color:#0D1B2A">${effectiveClient}</div>
    ${(useManualClient&&qClientAddr)?`<div style="font-size:11px;color:#6B7280;margin-top:3px;line-height:1.6">${qClientAddr.replace(/\n/g,"<br/>")}</div>`:""}
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
<script>setTimeout(()=>window.print(),400);</script>
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
                <label style={{fontSize:11,color:C.t3,fontWeight:600,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:".05em"}}>Client</label>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  <div style={{display:"flex",gap:6}}>
                    <select value={useManualClient?"__manual__":qClient}
                      onChange={e=>{
                        if(e.target.value==="__manual__"){setUseManualClient(true);}
                        else{setUseManualClient(false);setQClient(e.target.value);}
                      }}
                      style={{flex:1,padding:"8px 10px",border:`1px solid ${useManualClient?C.purple:C.b}`,borderRadius:C.rSm,fontSize:12,fontFamily:"inherit",boxSizing:"border-box"}}>
                      <option value="">— Sélectionner —</option>
                      {(clients||[]).map((c:string)=><option key={c} value={c}>{c}</option>)}
                      <option value="__manual__">✏️ Saisir manuellement…</option>
                    </select>
                  </div>
                  {useManualClient&&(
                    <div style={{display:"flex",flexDirection:"column",gap:4}}>
                      <input value={qClientManual} onChange={e=>setQClientManual(e.target.value)}
                        placeholder="Nom du client *"
                        style={{padding:"7px 10px",border:`2px solid ${C.purple}`,borderRadius:C.rSm,fontSize:12,fontFamily:"inherit",boxSizing:"border-box"}}/>
                      <textarea value={qClientAddr} onChange={e=>setQClientAddr(e.target.value)}
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
                            updateLine(idx,"desc",e.target.value);
                            const results=searchByDesc(e.target.value);
                            openDropdown(e,"desc",idx,results);
                          }}
                          onBlur={()=>setTimeout(closeDropdown,150)}
                          placeholder="Recherche par description…"
                          style={{width:"100%",padding:"6px 8px",
                            border:`1px solid ${line.desc&&line.pn?C.green:line.desc?C.blue:C.b}`,
                            borderRadius:5,fontSize:12,fontFamily:"inherit",boxSizing:"border-box"}}/>
                      </td>
                      <td style={{padding:"8px 8px",verticalAlign:"top",textAlign:"center"}}>
                        <input type="number" min="1" value={line.qty} onChange={e=>updateLine(idx,"qty",+e.target.value)}
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
                          style={{width:"100%",padding:"6px 8px",border:`1px solid ${C.b}`,borderRadius:5,fontSize:11,fontFamily:"inherit"}}>
                          {AVAIL_OPTIONS.map(a=><option key={a} value={a}>{a}</option>)}
                        </select>
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
                  onClick={()=>{
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
                style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,background:"#fff",color:C.t2,border:`1px solid ${C.b}`,borderRadius:C.r,padding:"9px 12px",fontSize:12,fontWeight:600,cursor:"pointer"}}>
                <i className="ti ti-file-text" style={{fontSize:14}} aria-hidden="true"/>
                Draft / Sans en-tête
              </button>
              <button onClick={()=>{setQLines([{pn:"",desc:"",qty:1,unitPrice:0,avail:"Stock",priceOptions:[],selectedPriceIdx:-1}]);setQClient("");setQNotes("");setQRef(`QT-${new Date().getFullYear()}-${String(Math.floor(Math.random()*900)+100)}`);}}
                style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,background:"#F1F5F9",color:C.t3,border:"none",borderRadius:C.r,padding:"8px",fontSize:12,cursor:"pointer"}}>
                <i className="ti ti-refresh" style={{fontSize:13}} aria-hidden="true"/> Nouveau devis
              </button>
            </div>
          </div>

          {/* Quote history */}
          {quotes.length>0&&(
            <div style={{background:"#fff",borderRadius:C.rLg,border:`1px solid ${C.b}`,boxShadow:C.sh,overflow:"hidden"}}>
              <div style={{padding:"12px 18px",borderBottom:`1px solid ${C.b}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span style={{fontSize:12,fontWeight:600,color:C.t1}}>Devis récents ({quotes.length})</span>
                <button onClick={async()=>{
                  const headers=["Référence","Client","Date","Lignes","Total HT (€)"];
                  const rows=quotes.map((q:any)=>[q.number,q.client,q.date,q.lines?.length||0,q.totalHT||0]);
                  await exportToExcel([headers,...rows],"devis_grundfos_"+new Date().toISOString().slice(0,10)+".xlsx","Devis");
                }} style={{display:"flex",alignItems:"center",gap:5,background:C.greenL,color:C.greenDk,border:"none",borderRadius:5,padding:"5px 10px",fontSize:10,fontWeight:600,cursor:"pointer"}}>
                  <i className="ti ti-file-spreadsheet" style={{fontSize:12}} aria-hidden="true"/> Export
                </button>
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                  <thead><tr style={{background:"#F8FAFC"}}>
                    {["Référence","Client","Date","Lignes","Total HT"].map(h=><th key={h} style={{padding:"7px 12px",textAlign:"left",color:C.t3,fontWeight:600,fontSize:10,textTransform:"uppercase"}}>{h}</th>)}
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
            <button onClick={async()=>{
              const headers=["Part Number","Description","Prix (€)","Date prix","Source"];
              const rows=filteredProducts.flatMap((p:any)=>
                (p.prices||[{price:"",date:"",source:""}]).map((pr:any)=>[p.pn,p.description||"",pr.price||"",pr.date||"",pr.source||""])
              );
              await exportToExcel([headers,...rows],"catalogue_grundfos_"+new Date().toISOString().slice(0,10)+".xlsx","Catalogue");
            }} style={{display:"flex",alignItems:"center",gap:6,background:C.greenL,color:C.greenDk,border:"none",borderRadius:C.r,padding:"7px 12px",fontSize:11,fontWeight:600,cursor:"pointer",flexShrink:0}}>
              <i className="ti ti-file-spreadsheet" style={{fontSize:13}} aria-hidden="true"/> Export
            </button>
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
                        const ROLES=[{key:"pn",label:"PN *"},{key:"desc",label:"Desc"},{key:"price",label:"Prix"},{key:"qty",label:"Qté"},{key:"customer",label:"Client"},{key:"avail",label:"Dispo"}];
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
  const getColor=(action:string)=>{for(const[k,v] of Object.entries(ACTION_COLORS)){if(action?.includes(k))return v;}return C.t3;};
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
        <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Filtrer par action, utilisateur…"
          style={{width:"100%",padding:"9px 12px 9px 34px",border:`1px solid ${C.b}`,borderRadius:C.r,fontSize:12,fontFamily:"inherit",boxSizing:"border-box"}}/>
      </div>
      <div style={{background:"#fff",borderRadius:C.rLg,border:`1px solid ${C.b}`,boxShadow:C.sh,overflow:"hidden"}}>
        {loading?<div style={{padding:32,textAlign:"center",color:C.t3}}>Chargement…</div>:
        filtered.length===0?<div style={{padding:32,textAlign:"center",color:C.t3}}>Aucune activité enregistrée</div>:(
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr style={{background:"#0D1B2A"}}>
                {["Date & Heure","Action","Utilisateur"].map(h=>(
                  <th key={h} style={{padding:"8px 14px",textAlign:"left",color:"#fff",fontWeight:600,fontSize:10,textTransform:"uppercase",letterSpacing:".05em"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtered.slice(0,200).map((l:any,i:number)=>(
                  <tr key={i} style={{borderBottom:`1px solid ${C.b}`,background:i%2===0?"#fff":"#FAFBFD"}}>
                    <td style={{padding:"8px 14px",color:C.t3,fontSize:11,whiteSpace:"nowrap"}}>{new Date(l.ts).toLocaleString("fr-FR",{day:"2-digit",month:"2-digit",year:"2-digit",hour:"2-digit",minute:"2-digit"})}</td>
                    <td style={{padding:"8px 14px"}}>
                      <span style={{background:String(getColor(l.action))+"18",color:String(getColor(l.action)),borderRadius:4,padding:"2px 8px",fontSize:10,fontWeight:700}}>{l.action||"—"}</span>
                    </td>
                    <td style={{padding:"8px 14px"}}>
                      <span style={{display:"flex",alignItems:"center",gap:5}}>
                        <span style={{width:24,height:24,borderRadius:99,background:C.blueL,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:C.blueDk}}>
                          {(l.user||"?")[0].toUpperCase()}
                        </span>
                        <span style={{fontSize:11,color:C.t2}}>{l.user||"—"}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
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
  const[selClients,setSelClients]=useState<string[]>(clients||[]);
  const toggleClient=(c:string)=>setSelClients(p=>p.includes(c)?p.filter(x=>x!==c):[...p,c]);

  const generate=()=>{
    const fd=new Date(fromDate+"T00:00:00"),td=new Date(toDate+"T00:00:00");
    td.setHours(23,59,59);
    const inRange=(d:string)=>{if(!d)return true;const dt=new Date(d+"T00:00:00");return dt>=fd&&dt<=td;};
    const allOrders=selClients.flatMap(c=>(data?.[c]||[]).map((o:any)=>({...o,_client:c})));
    const multiClient=selClients.length>1;

    // ── Generic subtotal builder ─────────────────────────────────────────────
    // Inserts a subtotal row between client groups + grand total at the end
    const withSubtotals=(items:any[],rowFn:(i:any)=>string,subtotalFn:(grp:any[],client:string)=>string,totalFn:(all:any[])=>string)=>{
      if(!multiClient) return items.map(rowFn).join("")+totalFn(items);
      const byClient:Record<string,any[]>={};
      items.forEach(i=>{const c=i._client||"—";if(!byClient[c])byClient[c]=[];byClient[c].push(i);});
      let out="";
      Object.keys(byClient).forEach(client=>{
        const grp=byClient[client];
        // Client header row
        out+=`<tr style="background:#1E3A5F"><td colspan="99" style="padding:8px 14px;color:#93C5FD;font-weight:700;font-size:12px;letter-spacing:.05em">📦 ${client}</td></tr>`;
        out+=grp.map(rowFn).join("");
        out+=subtotalFn(grp,client);
      });
      out+=totalFn(items);
      return out;
    };

    let rows="";
    let title="";

    if(rtype==="open_orders"){
      title="Open Orders — Commandes non entièrement facturées";
      const items=allOrders.filter(o=>{const inv=(o.invoices||[]).reduce((s:number,i:any)=>s+(+i.amount||0),0);return inv<(+o.amount||0)*0.999&&o.status!=="annule";});
      const rowOpen=(o:any)=>{const inv=(o.invoices||[]).reduce((s:number,i:any)=>s+(+i.amount||0),0);const open=Math.max(0,(+o.amount||0)-inv);return `<tr><td>${multiClient?"":o._client}</td><td>${o.poNumber||"—"}</td><td>${o.soNumber||"—"}</td><td>${fmtD(o.date)}</td><td>${o.status||"—"}</td><td style="text-align:right">${fmt(+o.amount||0)} €</td><td style="text-align:right">${fmt(inv)} €</td><td style="text-align:right;font-weight:700;color:#B45309">${fmt(open)} €</td></tr>`;};
      const subtotalOpen=(grp:any[],c:string)=>{const s=grp.reduce((acc,o)=>{const inv=(o.invoices||[]).reduce((ss:number,i:any)=>ss+(+i.amount||0),0);return acc+Math.max(0,(+o.amount||0)-inv);},0);return `<tr style="background:#FEF9EC;font-weight:700"><td colspan="7" style="text-align:right;color:#B45309;font-style:italic">Sous-total ${c}</td><td style="text-align:right;color:#B45309">${fmt(s)} €</td></tr>`;};
      const totalOpen=(all:any[])=>{const t=all.reduce((acc,o)=>{const inv=(o.invoices||[]).reduce((ss:number,i:any)=>ss+(+i.amount||0),0);return acc+Math.max(0,(+o.amount||0)-inv);},0);return `<tr style="background:#FEF3C7;font-weight:700"><td colspan="7" style="text-align:right">TOTAL OPEN ORDERS</td><td style="text-align:right">${fmt(t)} €</td></tr>`;};
      rows=withSubtotals(items,rowOpen,subtotalOpen,totalOpen);
      const headers="<tr><th>Client</th><th>N° PO</th><th>N° S/O</th><th>Date</th><th>Statut</th><th>PO (€)</th><th>Facturé (€)</th><th>Reste (€)</th></tr>";
      printReport(title,fromDate,toDate,headers,rows);
    } else if(rtype==="overdue"){
      title="Factures échues — Échéances dépassées non soldées";
      // Only invoices whose dueDate < today AND still have unpaid balance
      const items=allOrders.flatMap(o=>(o.invoices||[]).map((i:any)=>{
        const paid=(i.payments||[]).reduce((s:number,p:any)=>s+(+p.amount||0),0);
        const rem=Math.max(0,(+i.amount||0)-paid);
        const ps=payStatus(i);
        const isOverdue=["overdue","ov_part"].includes(ps.key);
        return{...i,_client:o._client,_po:o.poNumber,paid,rem,psLabel:ps.label,isOverdue,daysLate:i.dueDate?Math.abs(diffD(i.dueDate)):0};
      }).filter((i:any)=>i.isOverdue && i.rem>0));
      // Sort: most overdue first
      items.sort((a:any,b:any)=>b.daysLate-a.daysLate);
      const rowColor=(days:number)=>days>90?"#B91C1C":days>30?"#DC2626":"#EF4444";
      const rowOver=(i:any)=>`<tr style="border-left:3px solid ${rowColor(i.daysLate)}"><td style="font-weight:700">${multiClient?"":i._client}</td><td>${i._po||"—"}</td><td>${i.invoiceNumber||"—"}</td><td>${fmtD(i.date)}</td><td style="color:#B91C1C;font-weight:700">${fmtD(i.dueDate)}</td><td style="text-align:center;background:#FEE2E2;color:#B91C1C;font-weight:800">${i.daysLate}j</td><td style="text-align:right">${fmt(+i.amount||0)} €</td><td style="text-align:right">${fmt(i.paid)} €</td><td style="text-align:right;font-weight:700;color:#B91C1C">${fmt(i.rem)} €</td></tr>`;
      const subtotalOver=(grp:any[],c:string)=>`<tr style="background:#FFF0F0;font-weight:700"><td colspan="8" style="text-align:right;color:#B91C1C;font-style:italic">Sous-total ${c}</td><td style="text-align:right;color:#B91C1C">${fmt(grp.reduce((s:number,i:any)=>s+i.rem,0))} €</td></tr>`;
      const totalOver=(all:any[])=>`<tr style="background:#FEE2E2;font-weight:700"><td colspan="8" style="text-align:right;color:#B91C1C">TOTAL ÉCHU</td><td style="text-align:right;color:#B91C1C">${fmt(all.reduce((s:number,i:any)=>s+i.rem,0))} €</td></tr>`;
      rows=withSubtotals(items,rowOver,subtotalOver,totalOver);
      const headers="<tr><th>Client</th><th>N° PO</th><th>N° Facture</th><th>Date Facture</th><th>Échéance</th><th>Retard</th><th>Montant (€)</th><th>Payé (€)</th><th>Reste Dû (€)</th></tr>";
      printReport(title,fromDate,toDate,headers,rows);
    } else if(rtype==="upcoming"){
      title="Échéances à venir — 30 prochains jours";
      const today30=new Date();today30.setDate(today30.getDate()+30);
      const items=allOrders.flatMap(o=>(o.invoices||[]).map((i:any)=>{
        const paid=(i.payments||[]).reduce((s:number,p:any)=>s+(+p.amount||0),0);
        const rem=Math.max(0,(+i.amount||0)-paid);
        const ps=payStatus(i);
        if(rem<=0)return null;
        if(!i.dueDate)return null;
        const due=new Date(i.dueDate+"T00:00:00"),now=new Date();now.setHours(0,0,0,0);
        // Only future or today (not past)
        if(due<now)return null;
        if(due>today30)return null;
        const daysLeft=Math.ceil((due.getTime()-now.getTime())/86400000);
        return{...i,_client:o._client,_po:o.poNumber,paid,rem,psLabel:ps.label,daysLeft};
      }).filter(Boolean));
      items.sort((a:any,b:any)=>a.daysLeft-b.daysLeft);
      const urgBg=(d:number)=>d===0?"#FEF3C7":d<=7?"#FEF9EC":"#F0F9FF";
      const urgColor=(d:number)=>d===0?"#B45309":d<=7?"#D97706":"#0369A1";
      rows=items.map((i:any)=>`<tr style="background:${urgBg(i.daysLeft)}">
        <td style="font-weight:700">${i._client}</td>
        <td>${i._po||"—"}</td>
        <td style="font-weight:600;color:#7C3AED">${i.invoiceNumber||"—"}</td>
        <td>${fmtD(i.date)}</td>
        <td style="font-weight:700;color:${urgColor(i.daysLeft)}">${fmtD(i.dueDate)}</td>
        <td style="text-align:center"><span style="background:${urgColor(i.daysLeft)};color:#fff;padding:2px 10px;border-radius:4px;font-weight:700;font-size:11px">${i.daysLeft===0?"Aujourd'hui":i.daysLeft+"j"}</span></td>
        <td style="text-align:right">${fmt(+i.amount||0)} €</td>
        <td style="text-align:right;color:#059669">${i.paid>0?fmt(i.paid)+" €":"—"}</td>
        <td style="text-align:right;font-weight:700;color:#B45309">${fmt(i.rem)} €</td>
        <td><span style="background:#E0F2FE;color:#0369A1;padding:2px 8px;border-radius:4px;font-size:10px">${i.psLabel}</span></td>
      </tr>`).join("");
      const tot=items.reduce((s:number,i:any)=>s+i.rem,0);
      const todayItems=items.filter((i:any)=>i.daysLeft===0);
      const week=items.filter((i:any)=>i.daysLeft>0&&i.daysLeft<=7);
      const later=items.filter((i:any)=>i.daysLeft>7);
      rows+=`<tr style="background:#E0F2FE;font-weight:700;color:#0369A1">
        <td colspan="9" style="text-align:right">TOTAL À ENCAISSER (${items.length} factures · aujourd'hui: ${todayItems.length} · cette semaine: ${week.length} · sous 30j: ${later.length})</td>
        <td style="text-align:right">${fmt(tot)} €</td>
      </tr>`;
      const headers="<tr><th>Client</th><th>N° PO</th><th>N° Facture</th><th>Date émission</th><th>Échéance</th><th>Délai</th><th>Montant (€)</th><th>Payé (€)</th><th>Reste dû (€)</th><th>Statut</th></tr>";
      printReport(title,fromDate,toDate,headers,rows);
    } else if(rtype==="unpaid"){
      title="Factures en cours";
      const items=allOrders.flatMap(o=>(o.invoices||[]).filter((i:any)=>inRange(i.date)).map((i:any)=>{const paid=(i.payments||[]).reduce((s:number,p:any)=>s+(+p.amount||0),0);const rem=Math.max(0,(+i.amount||0)-paid);const ps=payStatus(i);return{...i,_client:o._client,_po:o.poNumber,paid,rem,psLabel:ps.label};}).filter((i:any)=>i.rem>0));
      rows=items.map(i=>`<tr><td>${i._client}</td><td>${i._po||"—"}</td><td>${i.invoiceNumber||"—"}</td><td>${fmtD(i.date)}</td><td>${fmtD(i.dueDate)}</td><td style="text-align:right">${fmt(+i.amount||0)} €</td><td style="text-align:right">${fmt(i.paid)} €</td><td style="text-align:right;font-weight:700;color:#DC2626">${fmt(i.rem)} €</td><td><span style="background:${i.rem>0?"#FEE2E2":"#D1FAE5"};color:${i.rem>0?"#B91C1C":"#047857"};padding:2px 8px;border-radius:4px;font-size:11px">${i.psLabel}</span></td></tr>`).join("");
      const tot=items.reduce((s:number,i:any)=>s+i.rem,0);
      rows+=`<tr style="background:#FEE2E2;font-weight:700"><td colspan="8" style="text-align:right">TOTAL IMPAYÉ</td><td style="text-align:right">${fmt(tot)} €</td></tr>`;
      const headers="<tr><th>Client</th><th>N° PO</th><th>N° Facture</th><th>Date</th><th>Échéance</th><th>Montant (€)</th><th>Payé (€)</th><th>Reste (€)</th><th>Statut</th></tr>";
      printReport(title,fromDate,toDate,headers,rows);
    } else if(rtype==="all_invoices"){
      title="Toutes les factures sur la période";
      const items=allOrders.flatMap(o=>(o.invoices||[]).filter((i:any)=>inRange(i.date)).map((i:any)=>{const paid=(i.payments||[]).reduce((s:number,p:any)=>s+(+p.amount||0),0);return{...i,_client:o._client,_po:o.poNumber,paid};}) );
      const rowAllInv=(i:any)=>`<tr><td>${multiClient?"":i._client}</td><td>${i._po||"—"}</td><td>${i.invoiceNumber||"—"}</td><td>${fmtD(i.date)}</td><td>${fmtD(i.dueDate)}</td><td style="text-align:right">${fmt(+i.amount||0)} €</td><td style="text-align:right">${fmt(i.paid)} €</td><td style="text-align:right">${fmt(Math.max(0,(+i.amount||0)-i.paid))} €</td></tr>`;
      const subtotalAllInv=(grp:any[],c:string)=>{const si=grp.reduce((s:number,i:any)=>s+(+i.amount||0),0);const sp=grp.reduce((s:number,i:any)=>s+i.paid,0);return `<tr style="background:#F0FDFA;font-weight:700"><td colspan="5" style="text-align:right;color:#0D9488;font-style:italic">Sous-total ${c}</td><td style="text-align:right;color:#0D9488">${fmt(si)} €</td><td style="text-align:right;color:#059669">${fmt(sp)} €</td><td style="text-align:right;color:#B45309">${fmt(si-sp)} €</td></tr>`;};
      const totalAllInv=(all:any[])=>{const ti=all.reduce((s:number,i:any)=>s+(+i.amount||0),0);const tp=all.reduce((s:number,i:any)=>s+i.paid,0);return `<tr style="background:#CCFBF1;font-weight:700"><td colspan="5" style="text-align:right">TOTAUX</td><td style="text-align:right">${fmt(ti)} €</td><td style="text-align:right">${fmt(tp)} €</td><td style="text-align:right">${fmt(ti-tp)} €</td></tr>`;};
      rows=withSubtotals(items,rowAllInv,subtotalAllInv,totalAllInv);
      const headers="<tr><th>Client</th><th>N° PO</th><th>N° Facture</th><th>Date</th><th>Échéance</th><th>Montant (€)</th><th>Payé (€)</th><th>Reste (€)</th></tr>";
      printReport(title,fromDate,toDate,headers,rows);
    } else {
      title="Synthèse par client";
      rows=selClients.map(c=>{const ords=data?.[c]||[];const po=ords.reduce((s:number,o:any)=>s+(+o.amount||0),0);const inv=ords.reduce((s:number,o:any)=>s+(o.invoices||[]).filter((i:any)=>inRange(i.date)).reduce((ss:number,i:any)=>ss+(+i.amount||0),0),0);const paid=ords.reduce((s:number,o:any)=>s+(o.invoices||[]).reduce((ss:number,i:any)=>ss+(i.payments||[]).reduce((sss:number,p:any)=>sss+(+p.amount||0),0),0),0);const open=Math.max(0,po-inv);const term=PAY_TERMS.find(t=>t.id===(configs[c]?.termId||"net60"))?.label||"—";return`<tr><td style="font-weight:700">${c}</td><td>${configs[c]?.accountNumber||"—"}</td><td>${term}</td><td>${ords.length}</td><td style="text-align:right">${fmt(po)} €</td><td style="text-align:right">${fmt(inv)} €</td><td style="text-align:right">${fmt(paid)} €</td><td style="text-align:right;font-weight:700;color:#B45309">${fmt(open)} €</td></tr>`;}).join("");
      const headers="<tr><th>Client</th><th>N° Compte</th><th>Conditions</th><th>Cmds</th><th>PO Total (€)</th><th>Facturé (€)</th><th>Encaissé (€)</th><th>Open Orders (€)</th></tr>";
      printReport(title,fromDate,toDate,headers,rows);
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
    <div class="header">
      <div><div class="logo">OrderTrack</div><h1>${title}</h1></div>
      <div class="meta">Généré le ${new Date().toLocaleDateString("fr-FR",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}<br/>Période : ${fmtD(from)} → ${fmtD(to)}</div>
    </div>
    <table><thead>${headers}</thead><tbody>${rows}</tbody></table>
    <div class="footer"><span>OrderTrack — Rapport confidentiel</span><span>Page 1</span></div>
    <script>setTimeout(()=>window.print(),400);</script>
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
        <Label t="Clients inclus"/>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:4}}>
          <button onClick={()=>setSelClients(clients)} style={{fontSize:11,padding:"3px 9px",borderRadius:4,border:`1px solid ${C.b}`,background:"#F8FAFC",cursor:"pointer",color:C.t2}}>Tous</button>
          <button onClick={()=>setSelClients([])} style={{fontSize:11,padding:"3px 9px",borderRadius:4,border:`1px solid ${C.b}`,background:"#F8FAFC",cursor:"pointer",color:C.t2}}>Aucun</button>
          {(clients||[]).map((c:string)=>(
            <button key={c} onClick={()=>toggleClient(c)} style={{fontSize:11,padding:"3px 9px",borderRadius:4,border:`2px solid ${selClients.includes(c)?C.blue:C.b}`,background:selClients.includes(c)?C.blueL:"#fff",color:selClients.includes(c)?C.blueDk:C.t2,fontWeight:selClients.includes(c)?600:400,cursor:"pointer"}}>{c}</button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
