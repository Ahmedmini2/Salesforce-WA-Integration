public class WhatsAppLWCService {

    @AuraEnabled
    public static sObject getCustomerPhone(String query){
            return Database.Query(query);
    }

    @AuraEnabled//(cacheable=true)
    public static List<WAMessage__c> listAllMessages(String customerPhone){
        List<WAMessage__c> messages = new List<WAMessage__c>();
        messages = [SELECT Id, Name, MessageContent__c, MessageType__c, CustomerName__c, AgentName__c, Outgoing__c, CreatedDate
                    FROM WAMessage__c
                    WHERE CustomerPhone__c =: customerPhone
                    Order By CreatedDate ASC
                ];
        return messages;
    }

    @AuraEnabled
    public static WAMessage__c getSingleMessage(String recordId, String customerPhone){
        return [SELECT Id, Name, MessageContent__c, MessageType__c, CustomerName__c, AgentName__c, Outgoing__c, CreatedDate
                    FROM WAMessage__c
                    WHERE Id =: recordId
                AND CustomerPhone__c =: customerPhone
                Order By CreatedDate ASC
            ];
    }
    
    @AuraEnabled
    public static WAMessage__c sendTextMessage(String messageContent, String toPhone){
        WAMessage__c message = WhatsAppUtils.sendTextMessage(messageContent, toPhone);
        return [SELECT Id, Name, MessageContent__c, MessageType__c, CustomerName__c, AgentName__c, Outgoing__c, CreatedDate
                FROM WAMessage__c
                WHERE Id =: message.Id
                Order By CreatedDate ASC
            ];
    }
    
    @AuraEnabled(cacheable=true) 
    public static List<WAMessage__c> listAllMessageByCustomer(String customerPhone){
        List<WAMessage__c> messages = new List<WAMessage__c>();
        messages = [SELECT Id, Name, MessageContent__c, MessageType__c, CustomerName__c, AgentName__c, Outgoing__c, CreatedDate
                    FROM WAMessage__c 
                    WHERE CustomerPhone__c =: customerPhone 
                    Order By CreatedDate ASC
                ];
        return messages;
    }
}
