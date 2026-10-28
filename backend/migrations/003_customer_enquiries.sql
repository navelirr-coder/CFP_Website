-- Customer enquiries recorded before handing off to WhatsApp.
-- submitted means recorded by CFP, not WhatsApp delivery confirmation.
CREATE TABLE IF NOT EXISTS customer_enquiries (
    id VARCHAR(64) PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(254) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    source VARCHAR(50) NOT NULL DEFAULT 'contact',
    whatsapp_number VARCHAR(20) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'submitted' CHECK (status = 'submitted'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_enquiries_created ON customer_enquiries(created_at);
