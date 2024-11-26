import {api, LightningElement, track, wire } from 'lwc';
import listAllMessages from '@salesforce/apex/WhatsAppLWCService.listAllMessages';
import sendTextMessage from '@salesforce/apex/WhatsAppLWCService.sendTextMessage'
import getSingleMessage from '@salesforce/apex/WhatsAppLWCService.getSingleMessage';
import getCustomerPhone from '@salesforce/apex/WhatsAppLWCService.getCustomerPhone';
import { subscribe, unsubscribe, onError } from 'lightning/empApi';


export default class Chatcomponent extends LightningElement {
    @api recordId;
    @api objectApiName;

    @track messages;
    @track errorDetails;

    showMessages = false;
    isSpinner = false;
    phone;
    messageText;

    eventName = '/event/WAMessageEvent__e' //PE
    subscription;

    queryString;

    connectedCallback() {
        this.handleErrorRegister();
        this.handleSubscribe();
        console.log('recordId:', this.recordId);
        console.log('objectApiName:', this.objectApiName); // Debugging log
        if(this.objectApiName === 'Contact'){
            this.queryString = `SELECT Id, Phone From Contact WHERE Id = '${this.recordId}' `;
        }else if(this.objectApiName === 'WAMessage__c'){
            this.queryString = `SELECT Id, CustomerPhone__c From WAMessage__c WHERE Id = '${this.recordId}' `;
        }else if(this.objectApiName === 'Lead'){
            this.queryString = `SELECT Phone From Lead WHERE id = '${this.recordId}'`;
        }
        console.log('CallBack End: ', this.queryString);
        this.handleCustomerPhoneJS();
    }

    handleCustomerPhoneJS(){
        if (!this.recordId || !this.objectApiName) {
            console.error('Missing recordId or objectApiName. Ensure the component is used in the correct context.');
            return;
        }4
        getCustomerPhone({
            query: this.queryString
        })
        .then((response) =>{
            console.log(response);
            if(this.objectApiName === 'WAMessage__c'){
                this.phone = response['CustomerPhone__c'];
            }else if(this.objectApiName === 'Lead' || this.objectApiName === 'Contact'){
                this.phone = response['Phone'];
            }
            console.log(this.phone);
            this.handleListAllMessages();
        })
        .catch((error) =>{
            console.log('Error: ',error);
        })
        .finally(()=>{

        })
    }

    disconnectedCallback() {
        this.handleUnSubscribe();
    }

    handleUnSubscribe() {
        //unsubscribe(this.subscription)
        unsubscribe(this.subscription, (response) => {
            console.log('unsubscribe() response : ', JSON.stringify(response));
        })
    }

    handleSubscribe() {
        subscribe(this.eventName, -1, this.handleSubscribeResponse.bind(this)).then((response) => {
            this.subscription = response;
            console.log('Subscribed to channel ', JSON.stringify(response));
        });
    }

    handleSubscribeResponse(response) {
        console.log('Response from WhatsApp Webhook ', JSON.stringify(response));
        let data = response.data.payload;
        let messageId = data.Message_Id__c;
        let customerPhone = data.Customer_Phone__c;
        if (this.phone === customerPhone) {
            // Make the Apex Class Call to get the message details
            getSingleMessage({
                recordId: messageId,
                customerPhone: customerPhone
            })
                .then((response) => {
                    this.messages.push(response);
                })
                .catch((error) => {
                    console.error('Error While Recieving the Platform Event Message')
                })
                .finally(() => {
                    let chatArea = this.template.querySelector('.chatArea');
                    if (chatArea) {
                        chatArea.scrollTop = chatArea.scrollHeight;
                    }
                })
        }
    }

    handleErrorRegister() {
        onError((error) => {
            console.error('Received error from server: ', JSON.stringify(error));
            // Error contains the server-side error
        });
    }

    handlePhoneChange(event) {
        event.preventDefault();
        this.phone = event.target.value;
        console.log(this.phone);
    }

    handleChat(event) {
        if(event){
            event.preventDefault();
        }
        console.log(this.phone);
        let allValid = this.handleValidate();
        console.log(allValid);
        if (allValid) {
           this.handleListAllMessages();
        } else {
            return;
        }
    }

    handleListAllMessages(){
        this.isSpinner = true;
       
            listAllMessages({
                customerPhone: this.phone
            })
                .then((result) => {
                    console.log(result);
                    this.messages = result.map(item => {
                        return {
                            ...item,
                            areaLabel: item.Outgoing__c ? `${item.AgentName__c} said at ${item.CreatedDate}` : `${item.CustomerName__c} said at ${item.CreatedDate}`
                        }
                    });
                    this.showMessages = true;
                    
                })
                .catch((errors) => {
                    this.errorDetails = errors;
                    this.showMessages = false;
                })
                .finally(() => {
                    //
                    let chatArea = this.template.querySelector('.chatArea');
                    if (chatArea) {
                        chatArea.scrollTop = chatArea.scrollHeight;
                    }
                    this.isSpinner = false;
                    this.setUpChatMessage();
                })
    }

    setUpChatMessage() {
        let chatInput = this.template.querySelector(".chat-input");
        if (chatInput) {
            chatInput.addEventListener("keydown", (event) => {
                if (event.key === "Enter") {
                    this.handleSendMessage();
                }
            });
        }
    }

    handleSendMessage() {
        let allValid = this.handleValidate();
        if (allValid) {
            this.isSpinner = true;
            sendTextMessage({
                messageContent: this.messageText,
                toPhone: this.phone
            })
                .then((result) => {
                    this.messages.push(result);
                })
                .catch((errors) => {
                    this.errorDetails = errors;
                    this.showMessages = false;
                })
                .finally(() => {
                    let chatArea = this.template.querySelector('.chatArea');
                    if (chatArea) {
                        chatArea.scrollTop = chatArea.scrollHeight;
                    }
                    this.isSpinner = false;
                    this.messageText = '';
                })
        }
    }

    handleChange(event) {
        event.preventDefault();
        this.messageText = event.target.value;
    }

    handleAnotherChat() {
        this.messageText = '';
        this.showMessages = false;
        this.messages = undefined;
    }

    handleValidate() {
        const allValid = [
            ...this.template.querySelectorAll('lightning-input'),
        ].reduce((validSoFar, inputCmp) => {
            inputCmp.reportValidity();
            return validSoFar && inputCmp.checkValidity();
        }, true);
        return allValid;
    }
}
